import { normalizeAnswer } from '../combat/answer-matching.js';
import type { StoryBeatRecord } from '../citadel-contract.js';
import { CHAPTER_1_STORY } from '../data/story/chapter-1.js';
import { CHAPTER_2_STORY } from '../data/story/chapter-2.js';
import { CHAPTER_3_STORY } from '../data/story/chapter-3.js';
import { CHAPTER_4_STORY } from '../data/story/chapter-4.js';
import { CHAPTER_5_STORY } from '../data/story/chapter-5.js';
import { isChapterUnlocked, type WordCounts } from '../progression/level-curve.js';
import type { DialogScript, DialogVariant, StoryBeat, StoryChapter, StoryQuest } from './story-types.js';

/** Các chương đã có nội dung; chương sau thêm vào đây. */
export const STORY_CHAPTERS: readonly StoryChapter[] = [
  CHAPTER_1_STORY,
  CHAPTER_2_STORY,
  CHAPTER_3_STORY,
  CHAPTER_4_STORY,
  CHAPTER_5_STORY,
];

/** Khoá một mốc trong tập đã xong: id mốc chỉ duy nhất trong một chương. */
export function beatKey(chapter: number, beat: string): string {
  return `${chapter}:${beat}`;
}

/** Tập mốc đã xong, tra nhanh theo `beatKey`. */
export class StoryProgress {
  private readonly done: ReadonlySet<string>;

  constructor(records: readonly Pick<StoryBeatRecord, 'chapter' | 'beat'>[]) {
    this.done = new Set(records.map((record) => beatKey(record.chapter, record.beat)));
  }

  has(chapter: number, beat: string): boolean {
    return this.done.has(beatKey(chapter, beat));
  }

  hasAll(chapter: number, beats: readonly string[]): boolean {
    return beats.every((beat) => this.has(chapter, beat));
  }
}

export function findChapter(chapter: number): StoryChapter | undefined {
  return STORY_CHAPTERS.find((entry) => entry.chapter === chapter);
}

/**
 * Chương đã tới lượt chưa: chương 1 luôn mở; chương sau chỉ "bắt đầu" khi chương liền trước đã xong mốc cuối.
 * Dùng để nhiệm vụ và hội thoại tự động của chương sau không hiện trước lúc người chơi hoàn thành chương trước
 * (cổng vào vùng còn khoá thêm theo số từ đã học ở `levelGateState`).
 */
function isChapterStarted(chapter: StoryChapter, progress: StoryProgress): boolean {
  const previous = findChapter(chapter.chapter - 1);
  return previous === undefined || progress.has(previous.chapter, previous.finalBeat);
}

export function findBeat(chapter: number, beatId: string): StoryBeat | undefined {
  return findChapter(chapter)?.beats.find((beat) => beat.id === beatId);
}

export type BeatRejection = 'unknown-beat' | 'prerequisites-missing' | 'battle-not-won' | 'wrong-answer';

export const BEAT_REJECTION_MESSAGES: Readonly<Record<BeatRejection, string>> = {
  'unknown-beat': 'Mốc truyện không tồn tại',
  'prerequisites-missing': 'Chưa xong các phần truyện trước',
  'battle-not-won': 'Cần thắng trận này trước',
  'wrong-answer': 'Chưa đúng chữ',
};

export interface BeatEvidence {
  /** Trận người chơi đã từng thắng. */
  readonly wonEncounterIds: ReadonlySet<string>;
  /** Chữ người chơi gõ cho mốc loại `word`. */
  readonly answer?: string | undefined;
}

export type BeatCheck = { readonly ok: true; readonly beat: StoryBeat } | { readonly ok: false; readonly reason: BeatRejection };

/** Server gọi trước khi ghi một mốc: mốc phải có thật, đủ mốc trước và đủ bằng chứng theo loại hoàn thành. */
export function checkBeatCompletion(chapter: number, beatId: string, progress: StoryProgress, evidence: BeatEvidence): BeatCheck {
  const beat = findBeat(chapter, beatId);
  if (beat === undefined) return { ok: false, reason: 'unknown-beat' };
  if (!progress.hasAll(chapter, beat.requires)) return { ok: false, reason: 'prerequisites-missing' };
  const { completion } = beat;
  if (completion.kind === 'battle' && !evidence.wonEncounterIds.has(completion.encounterId)) {
    return { ok: false, reason: 'battle-not-won' };
  }
  if (completion.kind === 'word' && normalizeAnswer(evidence.answer ?? '') !== normalizeAnswer(completion.word)) {
    return { ok: false, reason: 'wrong-answer' };
  }
  return { ok: true, beat };
}

/** Mốc đã đủ điều kiện làm nhưng chưa xong. */
export function isBeatAvailable(chapter: StoryChapter, beat: StoryBeat, progress: StoryProgress): boolean {
  return !progress.has(chapter.chapter, beat.id) && progress.hasAll(chapter.chapter, beat.requires);
}

function isVariantActive(chapter: number, variant: DialogVariant, progress: StoryProgress): boolean {
  if (!progress.hasAll(chapter, variant.requires ?? [])) return false;
  return variant.unless === undefined || !progress.has(chapter, variant.unless);
}

export interface ActiveDialog {
  readonly chapter: number;
  readonly script: DialogScript;
  readonly variant: DialogVariant;
}

/** Phiên bản hội thoại đầu tiên khớp trạng thái truyện; `null` khi không có hội thoại `dialogId`. */
export function selectDialog(dialogId: string, progress: StoryProgress): ActiveDialog | null {
  for (const chapter of STORY_CHAPTERS) {
    const script = chapter.dialogs.find((dialog) => dialog.id === dialogId);
    const variant = script?.variants.find((candidate) => isVariantActive(chapter.chapter, candidate, progress));
    if (script !== undefined && variant !== undefined) return { chapter: chapter.chapter, script, variant };
  }
  return null;
}

/** Hội thoại phải tự mở ngay (mở đầu, kết chương), `null` nếu không có. */
export function pendingAutoDialog(progress: StoryProgress): ActiveDialog | null {
  for (const chapter of STORY_CHAPTERS) {
    if (!isChapterStarted(chapter, progress)) continue;
    const beat = chapter.beats.find((candidate) => candidate.autoDialogId !== undefined && isBeatAvailable(chapter, candidate, progress));
    if (beat?.autoDialogId !== undefined) return selectDialog(beat.autoDialogId, progress);
  }
  return null;
}

/** Mốc chưa xong mà trận `encounterId` hoàn thành, nếu đã đủ điều kiện. */
export function beatForEncounter(encounterId: string, progress: StoryProgress): { chapter: number; beat: StoryBeat } | null {
  for (const chapter of STORY_CHAPTERS) {
    const beat = chapter.beats.find(
      (candidate) => candidate.completion.kind === 'battle' && candidate.completion.encounterId === encounterId && isBeatAvailable(chapter, candidate, progress),
    );
    if (beat !== undefined) return { chapter: chapter.chapter, beat };
  }
  return null;
}

/** Mốc hoàn thành bằng cách nhặt vật phẩm ở rương `itemId`. */
export function beatForItem(itemId: string): { chapter: number; beat: StoryBeat } | null {
  for (const chapter of STORY_CHAPTERS) {
    const beat = chapter.beats.find((candidate) => candidate.completion.kind === 'collect' && candidate.completion.itemId === itemId);
    if (beat !== undefined) return { chapter: chapter.chapter, beat };
  }
  return null;
}

export type GateState = { readonly open: true } | { readonly open: false; readonly message: string };

const OPEN: GateState = { open: true };

/**
 * Trận trên map có mở không. Trận gắn với một mốc đã xong thì đóng hẳn (không đánh lại trận truyện),
 * trừ trận lặp lại được (không mốc nào hoàn thành bằng nó).
 */
export function encounterGateState(encounterId: string, progress: StoryProgress): GateState | 'finished' {
  for (const chapter of STORY_CHAPTERS) {
    const storyBeat = chapter.beats.find((beat) => beat.completion.kind === 'battle' && beat.completion.encounterId === encounterId);
    if (storyBeat !== undefined && progress.has(chapter.chapter, storyBeat.id)) return 'finished';
    const gate = chapter.encounterGates.find((entry) => entry.encounterId === encounterId);
    if (gate !== undefined && !progress.hasAll(chapter.chapter, gate.requires)) return { open: false, message: gate.lockedMessage };
  }
  return OPEN;
}

/** Cổng sang level `levelId` có mở không (theo truyện và mốc mở chương). */
export function levelGateState(levelId: string, progress: StoryProgress, counts: WordCounts): GateState {
  for (const chapter of STORY_CHAPTERS) {
    const gate = chapter.levelGates.find((entry) => entry.levelId === levelId);
    if (gate === undefined) continue;
    if (!progress.hasAll(chapter.chapter, gate.requires)) return { open: false, message: gate.lockedMessage };
    if (gate.chapter !== undefined && !isChapterUnlocked(gate.chapter, counts)) {
      return { open: false, message: `${gate.lockedMessage} Cần thêm từ đã học ở LingoBrain (đang có ${counts.learned}).` };
    }
  }
  return OPEN;
}

/** Công trình ở Lexhold đang khoá vì chưa tới mốc truyện mở nó. */
export function lockedBuildings(progress: StoryProgress): ReadonlySet<string> {
  const locked = new Set<string>();
  for (const chapter of STORY_CHAPTERS) {
    for (const [building, beat] of Object.entries(chapter.buildingUnlocks)) {
      if (!progress.has(chapter.chapter, beat)) locked.add(building);
    }
  }
  return locked;
}

export interface QuestView {
  readonly quest: StoryQuest;
  readonly chapter: number;
  /** Mục tiêu của mốc đầu tiên chưa xong. */
  readonly objective: string;
  readonly done: number;
  readonly total: number;
}

/** Nhiệm vụ đang làm: đã mở (mốc nào đó đủ điều kiện) mà chưa xong hết. */
export function activeQuests(progress: StoryProgress): QuestView[] {
  const views: QuestView[] = [];
  for (const chapter of STORY_CHAPTERS) {
    if (!isChapterStarted(chapter, progress)) continue;
    const beatsById = new Map(chapter.beats.map((beat) => [beat.id, beat]));
    for (const quest of chapter.quests) {
      const beats = quest.beats.map((id) => beatsById.get(id)).filter((beat): beat is StoryBeat => beat !== undefined);
      const next = beats.find((beat) => isBeatAvailable(chapter, beat, progress));
      if (next === undefined) continue;
      const done = beats.filter((beat) => progress.has(chapter.chapter, beat.id)).length;
      views.push({ quest, chapter: chapter.chapter, objective: next.objective, done, total: beats.length });
    }
  }
  return views;
}

/** Chương đã xong mốc cuối. */
export function isChapterComplete(chapter: number, progress: StoryProgress): boolean {
  const content = findChapter(chapter);
  return content !== undefined && progress.has(chapter, content.finalBeat);
}
