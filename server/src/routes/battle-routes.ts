import { randomInt, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  apiPath,
  encounterGateState,
  findEncounter,
  MAX_BATTLE_LOG_ENTRIES,
  replayBattle,
  StoryProgress,
  type BattleLog,
  type BattleLogEntry,
  type BattleResultResponse,
  type Encounter,
  type SettledBattleOutcome,
  type StartBattleResponse,
} from '@herox/shared';
import { prepareBattle } from '../battle/battle-preparation.js';
import type { BattleStore } from '../battle/battle-repository.js';
import type { CitadelStore } from '../citadel/citadel-repository.js';
import type { AuthorizeRequest } from '../http/api-guard.js';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import type { LearningSource } from '../learning/learning-repository.js';
import { listLearnedWords } from '../learning/learning-stats.js';

export interface BattleRouteServices {
  readonly learning: LearningSource;
  readonly citadel: CitadelStore;
  readonly battles: BattleStore;
  readonly now?: () => number;
  /** Seed uint32 cho trận mới; thay được trong test để tái lập. */
  readonly newBattleSeed?: () => number;
  readonly newBattleId?: () => string;
}

// Trận chưa chốt sau 2 giờ coi như bỏ dở: không nhận kết quả nữa. Trận cũ bị bỏ khi người chơi bắt đầu trận mới.
const BATTLE_EXPIRY_MS = 2 * 60 * 60_000;
// Log không thể dài hơn thời gian thật đã trôi từ lúc server cấp trận; chừa sai số đồng hồ/bộ hẹn giờ của trình duyệt.
const WALL_CLOCK_TOLERANCE_MS = 2_000;
// Log tối đa 1000 input (~60 byte/input) vượt hạn mức body chung 16 KB nên route này nới riêng.
const BATTLE_RESULT_BODY_LIMIT_BYTES = 96 * 1024;
const UINT32_RANGE = 2 ** 32;
const BATTLE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type JsonFields = Readonly<Record<string, unknown>>;

function asFields(value: unknown): JsonFields | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonFields) : null;
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function invalidRequest(message: string): HttpError {
  return new HttpError(400, message, API_ERROR_CODES.invalidRequest);
}

function parseEncounter(body: unknown): Encounter {
  const encounterId = asFields(body)?.encounterId;
  const encounter = typeof encounterId === 'string' ? findEncounter(encounterId) : undefined;
  if (encounter === undefined) throw invalidRequest('Trận không tồn tại');
  return encounter;
}

function parseLogEntry(value: unknown): BattleLogEntry | null {
  const fields = asFields(value);
  if (fields === null || !isTime(fields.atMs)) return null;
  if (fields.kind === 'type' && typeof fields.text === 'string') return { atMs: fields.atMs, kind: 'type', text: fields.text };
  if (fields.kind === 'ring' && typeof fields.wordId === 'string') return { atMs: fields.atMs, kind: 'ring', wordId: fields.wordId };
  return null;
}

/** Kiểm hình dạng body; luật trận (thứ tự, tốc độ, lựa chọn hợp lệ) do `replayBattle` kiểm. */
function parseBattleLog(body: unknown): BattleLog {
  const fields = asFields(body);
  const rawEntries = fields?.entries;
  if (fields === null || !Array.isArray(rawEntries) || !isTime(fields.endedAtMs) || rawEntries.length > MAX_BATTLE_LOG_ENTRIES) {
    throw invalidRequest('Kết quả trận sai định dạng');
  }
  const entries = rawEntries.map(parseLogEntry);
  if (entries.some((entry) => entry === null)) throw invalidRequest('Kết quả trận sai định dạng');
  return { entries: entries as BattleLogEntry[], endedAtMs: fields.endedAtMs };
}

function battleNotFound(): HttpError {
  return new HttpError(404, 'Trận không tồn tại hoặc đã hết hạn', API_ERROR_CODES.battleNotFound);
}

function battleAlreadySettled(): HttpError {
  return new HttpError(409, 'Trận đã được ghi nhận', API_ERROR_CODES.battleSettled);
}

function battleRejected(): HttpError {
  return new HttpError(422, 'Kết quả trận không hợp lệ', API_ERROR_CODES.battleRejected);
}

/**
 * Đăng ký `POST /herox/api/battles` (cấp seed + setup) và `POST /herox/api/battles/:battleId/result`
 * (chạy lại log, chốt thưởng) vào scope đã có guard. Dùng POST cho cả hai để service worker không cache.
 */
export function registerBattleRoutes(scope: FastifyInstance, services: BattleRouteServices, authorize: AuthorizeRequest): void {
  const now = services.now ?? Date.now;
  const newBattleSeed = services.newBattleSeed ?? (() => randomInt(UINT32_RANGE));
  const newBattleId = services.newBattleId ?? randomUUID;

  scope.post(apiPath('battles'), async (request, reply): Promise<StartBattleResponse> => {
    const user = await authorize(request);
    const encounter = parseEncounter(request.body);
    const [progressData, deckWords, citadel, wordMisses, story] = await Promise.all([
      services.learning.readProgressData(user.userId),
      services.learning.readDeckWords(),
      services.citadel.readCitadel(user.userId),
      services.battles.readWordMisses(user.userId),
      services.citadel.readStory(user.userId),
    ]);
    if (citadel === null) throw new HttpError(409, 'Cần tạo nhân vật trước khi vào trận', API_ERROR_CODES.heroMissing);

    const prepared = prepareBattle({
      encounter,
      learnedWords: listLearnedWords(progressData, deckWords),
      deckWords,
      wordMisses,
      citadel,
      seed: newBattleSeed(),
    });

    // Chặn vào trận truyện khi chưa đủ mốc (tránh gọi thẳng API lách khoá rồi dùng chiến thắng đó ghi mốc).
    // Bỏ qua khi người chơi mới được chuyển vào trận tập (tutorial): họ chưa có mốc là bình thường.
    if (!prepared.tutorial) {
      const gate = encounterGateState(encounter.id, new StoryProgress(story));
      if (gate === 'finished') {
        throw new HttpError(409, 'Trận truyện này đã hoàn thành', API_ERROR_CODES.battleLocked);
      }
      if (!gate.open) {
        throw new HttpError(409, gate.message, API_ERROR_CODES.battleLocked);
      }
    }
    const battleId = newBattleId();
    const startedAtMs = now();
    await services.battles.createBattle(user.userId, battleId, prepared.setup, startedAtMs);
    void reply.code(201);
    return { battleId, setup: prepared.setup, tutorial: prepared.tutorial };
  });

  scope.post<{ Params: { battleId: string } }>(
    apiPath('battles/:battleId/result'),
    { bodyLimit: BATTLE_RESULT_BODY_LIMIT_BYTES },
    async (request): Promise<BattleResultResponse> => {
      const user = await authorize(request);
      const { battleId } = request.params;
      const log = parseBattleLog(request.body);
      if (!BATTLE_ID_PATTERN.test(battleId)) throw battleNotFound();
      const battle = await services.battles.findBattle(user.userId, battleId);
      const elapsedSinceStartMs = now() - (battle?.startedAtMs ?? 0);
      if (battle === null || elapsedSinceStartMs > BATTLE_EXPIRY_MS) throw battleNotFound();
      if (battle.settled) throw battleAlreadySettled();
      if (log.endedAtMs > elapsedSinceStartMs + WALL_CLOCK_TOLERANCE_MS) {
        request.log.info({ code: API_ERROR_CODES.battleRejected, violation: 'faster-than-wall-clock' }, 'Từ chối kết quả trận');
        throw battleRejected();
      }

      const replay = replayBattle(battle.setup, log);
      if (!replay.ok) {
        // Chỉ log mã vi phạm và vị trí, không log nội dung người chơi gõ.
        request.log.info(
          { code: API_ERROR_CODES.battleRejected, violation: replay.violation, entryIndex: replay.entryIndex },
          'Từ chối kết quả trận',
        );
        throw battleRejected();
      }

      const { state } = replay;
      const outcome: SettledBattleOutcome = state.outcome === 'ongoing' ? 'fled' : state.outcome;
      // Chỉ thắng mới nhận vàng; thua hay rời trận vẫn ghi từ sai để ôn.
      const goldEarned = outcome === 'victory' ? state.goldEarned : 0;
      const settled = await services.battles.settleBattle({
        userId: user.userId,
        battleId,
        goldEarned,
        misses: state.misses,
        settledAtMs: now(),
        wonEncounterId: outcome === 'victory' ? battle.setup.encounterId : null,
      });
      if (!settled) throw battleAlreadySettled();
      return { outcome, goldEarned, missedWordIds: [...state.misses.keys()] };
    },
  );
}
