import { WORD_CHAINS, type WordChain } from '../data/word-chains.js';
import { createBattle, step, type BattleState, type StepResult } from './battle-state.js';
import type { BattleInput, BattleSetup } from './battle-types.js';

/** Người không thể đọc đề rồi trả lời nhanh hơn 150 ms; client bỏ qua input sớm hơn, server coi là gian lận. */
export const MIN_REACTION_MS = 150;
export const MAX_BATTLE_DURATION_MS = 30 * 60_000;
export const MAX_BATTLE_LOG_ENTRIES = 1_000;
export const MAX_TYPED_ANSWER_LENGTH = 64;

/** Một input trong log trận: thời điểm (ms tính từ đầu trận, đúng `elapsedMs` lúc áp dụng) và nội dung. */
export type BattleLogEntry = BattleInput & { readonly atMs: number };

export interface BattleLog {
  readonly entries: readonly BattleLogEntry[];
  /** Thời điểm client kết thúc trận (thắng, thua hoặc rời trận). */
  readonly endedAtMs: number;
}

export type ReplayViolation =
  | 'too-many-entries'
  | 'out-of-order'
  | 'too-long'
  | 'input-after-end'
  | 'too-fast'
  | 'unknown-option'
  | 'answer-too-long';

export type ReplayResult =
  | { readonly ok: true; readonly state: BattleState }
  | { readonly ok: false; readonly violation: ReplayViolation; readonly entryIndex: number | null };

/** `true` khi input tới quá sớm sau lúc đề hiện; client dùng để bỏ qua chạm/gõ vô tình, server dùng để từ chối log. */
export function isInputTooFast(state: BattleState): boolean {
  return state.prompt !== null && state.elapsedMs - state.prompt.shownAtMs < MIN_REACTION_MS;
}

function checkInput(state: BattleState, input: BattleInput): ReplayViolation | null {
  if (state.outcome !== 'ongoing' || state.prompt === null) return 'input-after-end';
  if (isInputTooFast(state)) return 'too-fast';
  if (input.kind === 'ring' && !state.prompt.options.includes(input.wordId)) return 'unknown-option';
  if (input.kind === 'type' && input.text.length > MAX_TYPED_ANSWER_LENGTH) return 'answer-too-long';
  return null;
}

function toInput(entry: BattleLogEntry): BattleInput {
  return entry.kind === 'ring' ? { kind: 'ring', wordId: entry.wordId } : { kind: 'type', text: entry.text };
}

export interface RecordedStepResult extends StepResult {
  /** Dòng cần thêm vào log gửi server; `null` khi không có input hoặc input bị bỏ qua. */
  readonly logEntry: BattleLogEntry | null;
}

/**
 * Bước dành cho client: cho thời gian trôi `dtMs`, rồi chỉ áp `input` nếu qua đúng các luật server kiểm khi chạy lại
 * (không tới sớm hơn 150 ms sau khi đề hiện, ô có trên vòng từ, không quá dài). Input bị bỏ qua không vào log,
 * nên log của client thật luôn được server chạy lại khớp — kể cả khi đề cũ vừa hết giờ ngay trong khung hình đó.
 */
export function stepRecorded(state: BattleState, input: BattleInput | null, dtMs: number): RecordedStepResult {
  const advanced = step(state, null, dtMs);
  if (input === null || checkInput(advanced.state, input) !== null) return { ...advanced, logEntry: null };
  const applied = step(advanced.state, input, 0);
  return {
    state: applied.state,
    events: [...advanced.events, ...applied.events],
    logEntry: { ...input, atMs: advanced.state.elapsedMs },
  };
}

function isValidTime(atMs: number, notBefore: number): boolean {
  return Number.isFinite(atMs) && atMs >= notBefore;
}

/**
 * Chạy lại trận từ setup và log input; dừng ở vi phạm đầu tiên.
 * Log client ghi bằng `stepRecorded` luôn qua được vì cùng `step` và cùng các luật kiểm này.
 */
export function replayBattle(setup: BattleSetup, log: BattleLog, chains: readonly WordChain[] = WORD_CHAINS): ReplayResult {
  if (log.entries.length > MAX_BATTLE_LOG_ENTRIES) return { ok: false, violation: 'too-many-entries', entryIndex: null };
  let state = createBattle(setup, chains).state;
  for (const [entryIndex, entry] of log.entries.entries()) {
    if (!isValidTime(entry.atMs, state.elapsedMs)) return { ok: false, violation: 'out-of-order', entryIndex };
    if (entry.atMs > MAX_BATTLE_DURATION_MS) return { ok: false, violation: 'too-long', entryIndex };
    state = step(state, null, entry.atMs - state.elapsedMs).state;
    const input = toInput(entry);
    const violation = checkInput(state, input);
    if (violation !== null) return { ok: false, violation, entryIndex };
    state = step(state, input, 0).state;
  }
  if (!isValidTime(log.endedAtMs, state.elapsedMs)) return { ok: false, violation: 'out-of-order', entryIndex: null };
  if (log.endedAtMs > MAX_BATTLE_DURATION_MS) return { ok: false, violation: 'too-long', entryIndex: null };
  state = step(state, null, log.endedAtMs - state.elapsedMs).state;
  return { ok: true, state };
}
