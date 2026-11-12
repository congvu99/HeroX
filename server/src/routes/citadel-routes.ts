import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  apiPath,
  applyCitadelAction,
  buildCitadelResponse,
  CITADEL_REJECTION_MESSAGES,
  localDayKey,
  SKILL_KINDS,
  type CitadelAction,
  type CitadelLearningStats,
  type CitadelResponse,
  type CitadelState,
  type CitadelWord,
  type StoryBeatRecord,
  type UpgradeTarget,
} from '@herox/shared';
import type { CitadelStore } from '../citadel/citadel-repository.js';
import type { AuthorizeRequest } from '../http/api-guard.js';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import { readUtcOffsetMinutes } from '../http/utc-offset.js';
import type { LearningSource } from '../learning/learning-repository.js';
import { computeLearningStats, listLearnedWords } from '../learning/learning-stats.js';
import { normalizePartOfSpeech } from '../learning/part-of-speech.js';

export interface CitadelRouteServices {
  readonly learning: LearningSource;
  readonly citadel: CitadelStore;
  readonly now?: () => number;
}

// Id trong catalog và id từ của LingoBrain đều ngắn; chặn chuỗi dài bất thường trước khi tra.
const MAX_ID_LENGTH = 64;

type JsonFields = Readonly<Record<string, unknown>>;

interface PlayerLearning {
  readonly stats: CitadelLearningStats;
  readonly words: readonly CitadelWord[];
  readonly learnedWordIds: ReadonlySet<string>;
}

interface ParsedMutation {
  readonly rowVersion: number;
  readonly action: CitadelAction;
}

function invalidRequest(): HttpError {
  return new HttpError(400, 'Yêu cầu thành trì sai định dạng', API_ERROR_CODES.invalidRequest);
}

function asFields(value: unknown): JsonFields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw invalidRequest();
  return value as JsonFields;
}

function readId(value: unknown): string {
  if (typeof value !== 'string' || value === '' || value.length > MAX_ID_LENGTH) throw invalidRequest();
  return value;
}

function readRowVersion(fields: JsonFields): number {
  const value = fields.rowVersion;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw invalidRequest();
  return value;
}

function parseUpgradeTarget(value: unknown): UpgradeTarget {
  const fields = asFields(value);
  if (fields.kind === 'forge') return { kind: 'forge' };
  if (fields.kind === 'item') return { kind: 'item', itemId: readId(fields.itemId) };
  const skill = SKILL_KINDS.find((kind) => kind === fields.skill);
  if (fields.kind === 'skill' && skill !== undefined) return { kind: 'skill', skill };
  throw invalidRequest();
}

function parseWordIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw invalidRequest();
  return value.map(readId);
}

/** Đọc `rowVersion` và thao tác theo route; luật nghiệp vụ do `applyCitadelAction` kiểm. */
const MUTATION_PARSERS: Readonly<Record<CitadelAction['type'], (fields: JsonFields) => CitadelAction>> = {
  upgrade: (fields) => ({ type: 'upgrade', target: parseUpgradeTarget(fields.target) }),
  equip: (fields) => ({ type: 'equip', itemId: readId(fields.itemId) }),
  outfit: (fields) => ({ type: 'outfit', outfitId: readId(fields.outfitId) }),
  loadout: (fields) => ({ type: 'loadout', wordIds: parseWordIds(fields.wordIds) }),
  'daily-crystals': () => ({ type: 'daily-crystals' }),
};

function toCitadelStats(stats: ReturnType<typeof computeLearningStats>): CitadelLearningStats {
  return {
    learned: stats.learned,
    mastered: stats.mastered,
    streakDays: stats.streakDays,
    retention30: stats.retention30,
    byPos: stats.byPos,
  };
}

function buildResponse(state: CitadelState, learning: PlayerLearning, story: readonly StoryBeatRecord[], today: string): CitadelResponse {
  return buildCitadelResponse({ state, stats: learning.stats, words: learning.words, story, today });
}

/**
 * Đăng ký `GET /herox/api/citadel` và các route ghi `POST /herox/api/citadel/{upgrade,equip,outfit,loadout,daily-crystals}`.
 * Mọi route cần `?utcOffset=` (ngày nhận pha lê theo giờ người chơi) và trả `CitadelResponse` mới nhất.
 * Route ghi kiểm `rowVersion`: lệch thì 409 để client tải lại thay vì ghi đè thao tác của máy khác.
 */
export function registerCitadelRoutes(scope: FastifyInstance, services: CitadelRouteServices, authorize: AuthorizeRequest): void {
  const now = services.now ?? Date.now;

  async function readLearning(userId: number, utcOffsetMinutes: number): Promise<PlayerLearning> {
    const [progressData, deckWords] = await Promise.all([
      services.learning.readProgressData(userId),
      services.learning.readDeckWords(),
    ]);
    const learned = listLearnedWords(progressData, deckWords);
    return {
      stats: toCitadelStats(computeLearningStats(progressData, deckWords, now(), { utcOffsetMinutes })),
      words: learned.map(({ word, mastered }) => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        emoji: word.emoji,
        ipa: word.ipa,
        pos: normalizePartOfSpeech(word.pos),
        mastered,
      })),
      learnedWordIds: new Set(learned.map(({ word }) => word.id)),
    };
  }

  function heroMissing(): HttpError {
    return new HttpError(409, 'Cần tạo nhân vật trước khi vào thành trì', API_ERROR_CODES.heroMissing);
  }

  scope.get(apiPath('citadel'), async (request): Promise<CitadelResponse> => {
    const utcOffsetMinutes = readUtcOffsetMinutes(request.query);
    const user = await authorize(request);
    const [state, learning, story] = await Promise.all([
      services.citadel.readCitadel(user.userId),
      readLearning(user.userId, utcOffsetMinutes),
      services.citadel.readStory(user.userId),
    ]);
    if (state === null) throw heroMissing();
    return buildResponse(state, learning, story, localDayKey(now(), utcOffsetMinutes));
  });

  async function handleMutation(request: FastifyRequest, parse: (fields: JsonFields) => CitadelAction): Promise<CitadelResponse> {
    const utcOffsetMinutes = readUtcOffsetMinutes(request.query);
    const user = await authorize(request);
    const fields = asFields(request.body);
    const parsed: ParsedMutation = { rowVersion: readRowVersion(fields), action: parse(fields) };
    const today = localDayKey(now(), utcOffsetMinutes);
    const [learning, story] = await Promise.all([readLearning(user.userId, utcOffsetMinutes), services.citadel.readStory(user.userId)]);
    const context = { stats: learning.stats, today, learnedWordIds: learning.learnedWordIds };
    const update = await services.citadel.updateCitadel(user.userId, parsed.rowVersion, (state) => {
      const result = applyCitadelAction(state, context, parsed.action);
      if (result.ok) return result.state;
      request.log.info({ code: API_ERROR_CODES.citadelRejected, action: parsed.action.type, reason: result.reason }, 'Từ chối thao tác thành trì');
      throw new HttpError(422, CITADEL_REJECTION_MESSAGES[result.reason], API_ERROR_CODES.citadelRejected);
    });
    if (update.kind === 'missing') throw heroMissing();
    if (update.kind === 'conflict') {
      throw new HttpError(409, 'Thành trì vừa thay đổi ở nơi khác, đã tải lại', API_ERROR_CODES.citadelConflict);
    }
    return buildResponse(update.state, learning, story, today);
  }

  for (const [route, parse] of Object.entries(MUTATION_PARSERS)) {
    scope.post(apiPath(`citadel/${route}`), (request) => handleMutation(request, parse));
  }
}
