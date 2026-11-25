import {
  localDayKey,
  PART_OF_SPEECH_GROUPS,
  type LearningStats,
  type PartOfSpeechGroup,
  type WeakWord,
} from '@herox/shared';
import { normalizePartOfSpeech } from './part-of-speech.js';

/** Một từ trong bộ từ LingoBrain (`public.words`), chỉ các cột HeroX đọc. */
export interface DeckWord {
  readonly id: string;
  readonly word: string;
  readonly pos: string;
  readonly meaning: string;
  readonly emoji: string;
  readonly ipa: string;
}

export interface LearningStatsOptions {
  /** Độ lệch múi giờ của người chơi, phút về phía đông UTC (Việt Nam = 420). Quyết định "hôm nay" khi tính chuỗi ngày. */
  readonly utcOffsetMinutes?: number;
}

/** Payload tiến độ có `v` khác phiên bản HeroX hiểu: LingoBrain đã đổi hợp đồng, không được tính số sai. */
export class UnsupportedProgressVersionError extends Error {
  constructor(readonly version: unknown) {
    super('Phiên bản dữ liệu tiến độ LingoBrain chưa được hỗ trợ');
    this.name = 'UnsupportedProgressVersionError';
  }
}

// Hợp đồng payload v1 của LingoBrain: eng/js/sync-merge.js (đầu file).
const SUPPORTED_PROGRESS_VERSION = 1;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
// "Đã thuộc" = khoảng cách ôn từ 21 ngày trở lên (eng/js/srs-scheduler.js deckSummary).
export const MASTERED_INTERVAL_DAYS = 21;
// Tỉ lệ nhớ 30 ngày tính trên lượt ôn có tuổi ≤ 30 ngày (eng/js/stats-dashboard.js computeStats).
const RETENTION_WINDOW_MS = 30 * DAY_MS;
const FORGOT_GRADE = 0;
// Điểm chấm hợp lệ: 0 quên · 1 khó · 2 nhớ · 3 dễ (eng/js/sync-merge.js cleanRec bỏ lượt có điểm khác).
const VALID_GRADES: ReadonlySet<number> = new Set([0, 1, 2, 3]);
const NEW_STATE = 'new';
const WEAK_WORDS_LIMIT = 10;
// Giáo án mặc định khi payload chưa có `plan` (eng/js/daily-plan.js DEFAULT_PLAN, id t1..t7).
const DEFAULT_PLAN_TASK_IDS: readonly string[] = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];

type JsonObject = Readonly<Record<string, unknown>>;

interface SrsRecord {
  readonly state: string;
  readonly ivl: number;
  readonly ef: number;
  readonly lapses: number;
  /** Mốc ôn tiếp theo (ms); dùng để xếp nhóm "đến hạn". */
  readonly due: number;
  /** Số lượt ôn thành công liên tiếp (eng/js/srs-scheduler.js); từ còn non khi `reps` nhỏ. */
  readonly reps: number;
  readonly last: number;
  readonly mt: number;
  readonly gradeTimes: readonly GradeEntry[];
}

interface GradeEntry {
  readonly time: number;
  readonly grade: number;
}

interface LearnedWord {
  readonly word: DeckWord;
  readonly record: SrsRecord;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readGradeEntries(value: unknown): GradeEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isJsonObject).flatMap((entry) =>
    typeof entry.t === 'number' && Number.isFinite(entry.t) && typeof entry.g === 'number' && VALID_GRADES.has(entry.g)
      ? [{ time: entry.t, grade: entry.g }]
      : [],
  );
}

function readSrsRecord(value: unknown): SrsRecord | null {
  if (!isJsonObject(value)) return null;
  return {
    state: typeof value.state === 'string' ? value.state : NEW_STATE,
    ivl: readNumber(value.ivl),
    ef: readNumber(value.ef),
    lapses: Math.max(0, readNumber(value.lapses)),
    due: readNumber(value.due),
    reps: Math.max(0, readNumber(value.reps)),
    last: readNumber(value.last),
    mt: readNumber(value.mt),
    gradeTimes: readGradeEntries(value.hist),
  };
}

/** Đọc mọi record còn hiệu lực; record có max(last, mt) < srsEpoch coi như đã bị xoá (eng/js/sync-merge.js mergeSync). */
function readLiveSrs(payload: JsonObject): Map<string, SrsRecord> {
  const epoch = readNumber(payload.srsEpoch);
  const records = new Map<string, SrsRecord>();
  if (!isJsonObject(payload.srs)) return records;
  for (const [id, raw] of Object.entries(payload.srs)) {
    const record = readSrsRecord(raw);
    if (record && Math.max(record.last, record.mt) >= epoch) records.set(id, record);
  }
  return records;
}

/** Chỉ giữ record của từ còn trong bộ, như client LingoBrain sau `pruneSrs` (eng/js/srs-scheduler.js). */
function keepDeckRecords(deckWords: readonly DeckWord[], srs: ReadonlyMap<string, SrsRecord>): Map<string, SrsRecord> {
  const deckRecords = new Map<string, SrsRecord>();
  for (const word of deckWords) {
    const record = srs.get(word.id);
    if (record) deckRecords.set(word.id, record);
  }
  return deckRecords;
}

function collectLearnedWords(deckWords: readonly DeckWord[], srs: ReadonlyMap<string, SrsRecord>): LearnedWord[] {
  return deckWords.flatMap((word) => {
    const record = srs.get(word.id);
    return record && record.state !== NEW_STATE ? [{ word, record }] : [];
  });
}

function countByPartOfSpeech(learnedWords: readonly LearnedWord[]): Record<PartOfSpeechGroup, number> {
  const counts = Object.fromEntries(PART_OF_SPEECH_GROUPS.map((group) => [group, 0])) as Record<PartOfSpeechGroup, number>;
  for (const { word } of learnedWords) counts[normalizePartOfSpeech(word.pos)] += 1;
  return counts;
}

function computeRetention30(learnedWords: readonly LearnedWord[], now: number): number | null {
  let passed = 0;
  let failed = 0;
  for (const { record } of learnedWords) {
    for (const entry of record.gradeTimes) {
      if (now - entry.time > RETENTION_WINDOW_MS) continue;
      if (entry.grade === FORGOT_GRADE) failed += 1;
      else passed += 1;
    }
  }
  return passed + failed === 0 ? null : passed / (passed + failed);
}

// Cùng thứ tự "Hay quên nhất" của LingoBrain: quên nhiều trước, hệ số dễ thấp trước.
function selectWeakWords(learnedWords: readonly LearnedWord[]): WeakWord[] {
  return learnedWords
    .filter(({ record }) => record.lapses > 0)
    .sort((a, b) => b.record.lapses - a.record.lapses || a.record.ef - b.record.ef)
    .slice(0, WEAK_WORDS_LIMIT)
    .map(({ word, record }) => ({ id: word.id, word: word.word, lapses: record.lapses }));
}

/** Đồng hồ theo múi giờ người chơi: đổi mốc thời gian ↔ khoá ngày `YYYY-MM-DD` như `dkey` của LingoBrain. */
class PlayerCalendar {
  private readonly offsetMs: number;

  constructor(utcOffsetMinutes: number) {
    this.offsetMs = utcOffsetMinutes * MINUTE_MS;
  }

  dayKey(time: number): string {
    return localDayKey(time, this.offsetMs / MINUTE_MS);
  }

  dayStart(dayKey: string): number {
    return Date.parse(`${dayKey}T00:00:00Z`) - this.offsetMs;
  }
}

function hasGradeOnDay(srs: ReadonlyMap<string, SrsRecord>, calendar: PlayerCalendar, dayKey: string): boolean {
  const from = calendar.dayStart(dayKey);
  const to = from + DAY_MS;
  for (const record of srs.values()) {
    if (record.gradeTimes.some((entry) => entry.time >= from && entry.time < to)) return true;
  }
  return false;
}

function readPlanTaskIds(payload: JsonObject): readonly string[] {
  const plan = isJsonObject(payload.plan) ? payload.plan.data : undefined;
  if (!Array.isArray(plan)) return DEFAULT_PLAN_TASK_IDS;
  return plan.filter(isJsonObject).flatMap((task) => (typeof task.id === 'string' ? [task.id] : []));
}

function isPlanComplete(taskIds: readonly string[], done: JsonObject): boolean {
  return taskIds.length > 0 && taskIds.every((id) => Boolean(done[id]));
}

/**
 * Chuỗi ngày học, tái hiện `rollDay` (eng/js/daily-plan.js) và `streakNow` (eng/js/home-today-screen.js):
 * `day.streak` đếm tới ngày lưu trước đó; ngày đủ = có ôn ít nhất 1 thẻ hoặc tích đủ giáo án.
 */
function computeStreakDays(
  payload: JsonObject,
  srs: ReadonlyMap<string, SrsRecord>,
  now: number,
  calendar: PlayerCalendar,
): number {
  const today = calendar.dayKey(now);
  const day = isJsonObject(payload.day) && isJsonObject(payload.day.data) ? payload.day.data : {};
  const storedDate = typeof day.date === 'string' ? day.date : today;
  const planTaskIds = readPlanTaskIds(payload);
  let streak = Math.max(0, readNumber(day.streak));
  let todayDone: JsonObject = isJsonObject(day.done) ? day.done : {};

  if (storedDate < today) {
    // Sang ngày mới: ngày lưu đủ thì cộng nối tiếp nếu là hôm qua, cách quãng thì LingoBrain bắt đầu lại từ 1.
    const wasFull = isPlanComplete(planTaskIds, todayDone) || hasGradeOnDay(srs, calendar, storedDate);
    const isYesterday = storedDate === calendar.dayKey(now - DAY_MS);
    if (!wasFull) streak = 0;
    else streak = isYesterday ? streak + 1 : 1;
    todayDone = {};
  } else if (storedDate > today) {
    // Ngày lưu ở tương lai (đồng hồ máy từng chạy nhanh): chỉ đưa về hôm nay, giữ nguyên chuỗi.
    todayDone = {};
  }

  const studiedToday = hasGradeOnDay(srs, calendar, today) || isPlanComplete(planTaskIds, todayDone);
  return streak + (studiedToday ? 1 : 0);
}

function assertSupportedVersion(payload: JsonObject): void {
  if (payload.v !== undefined && payload.v !== SUPPORTED_PROGRESS_VERSION) {
    throw new UnsupportedProgressVersionError(payload.v);
  }
}

/** Một từ đã học kèm dữ liệu SRS, dùng để xếp nhóm và chọn từ cho trận. */
export interface LearnedWordProgress {
  readonly word: DeckWord;
  readonly mastered: boolean;
  /** Số lần quên ở LingoBrain. */
  readonly lapses: number;
  /** Trạng thái SRS: `new` | `learning` | `review` | `relearn`. */
  readonly state: string;
  /** Khoảng cách ôn hiện tại (ngày). */
  readonly ivl: number;
  /** Hệ số dễ (ease factor) SM-2; thấp = hay sai. */
  readonly ef: number;
  /** Mốc ôn tiếp theo (ms). */
  readonly due: number;
  /** Số lượt ôn thành công liên tiếp. */
  readonly reps: number;
  /** Điểm lượt chấm muộn nhất trong `hist` (0 quên · 1 khó · 2 nhớ · 3 dễ), `null` khi chưa có lượt nào. */
  readonly lastGrade: number | null;
}

/** Điểm của lượt chấm muộn nhất theo thời gian; `null` khi lịch sử rỗng. */
function latestGrade(gradeTimes: readonly GradeEntry[]): number | null {
  return gradeTimes.reduce<GradeEntry | null>((latest, entry) => (latest === null || entry.time >= latest.time ? entry : latest), null)?.grade ?? null;
}

/**
 * Danh sách từ đã học (cùng định nghĩa với `learned` của `computeLearningStats`), theo thứ tự bộ từ.
 * @throws UnsupportedProgressVersionError khi `v` của payload khác phiên bản hỗ trợ.
 */
export function listLearnedWords(progressData: unknown, deckWords: readonly DeckWord[]): LearnedWordProgress[] {
  const payload = isJsonObject(progressData) ? progressData : {};
  assertSupportedVersion(payload);
  const srs = keepDeckRecords(deckWords, readLiveSrs(payload));
  return collectLearnedWords(deckWords, srs).map(({ word, record }) => ({
    word,
    mastered: record.ivl >= MASTERED_INTERVAL_DAYS,
    lapses: record.lapses,
    state: record.state,
    ivl: record.ivl,
    ef: record.ef,
    due: record.due,
    reps: record.reps,
    lastGrade: latestGrade(record.gradeTimes),
  }));
}

/**
 * Tính chỉ số học từ `progress.data` của LingoBrain và bộ từ hiện hành.
 * Thuần, đọc phòng thủ: trường thiếu hoặc sai kiểu coi như 0; chỉ tính từ còn trong bộ.
 * Giới hạn đã biết: server LingoBrain chỉ lưu 20 lượt chấm gần nhất mỗi từ (client giữ 50), nên `retention30`
 * có thể lệch nhẹ so với số trên máy người dùng khi một từ được ôn hơn 20 lần trong 30 ngày.
 * @throws UnsupportedProgressVersionError khi `v` của payload khác phiên bản hỗ trợ.
 */
export function computeLearningStats(
  progressData: unknown,
  deckWords: readonly DeckWord[],
  now: number,
  options: LearningStatsOptions = {},
): LearningStats {
  const payload = isJsonObject(progressData) ? progressData : {};
  assertSupportedVersion(payload);
  const srs = keepDeckRecords(deckWords, readLiveSrs(payload));
  const learnedWords = collectLearnedWords(deckWords, srs);
  const calendar = new PlayerCalendar(options.utcOffsetMinutes ?? 0);

  return {
    learned: learnedWords.length,
    mastered: learnedWords.filter(({ record }) => record.ivl >= MASTERED_INTERVAL_DAYS).length,
    byPos: countByPartOfSpeech(learnedWords),
    streakDays: computeStreakDays(payload, srs, now, calendar),
    retention30: computeRetention30(learnedWords, now),
    weakWords: selectWeakWords(learnedWords),
  };
}
