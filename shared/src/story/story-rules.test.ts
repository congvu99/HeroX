import { describe, expect, it } from 'vitest';
import {
  FIELD_ENCOUNTER_ID,
  FIELD_ROAM_ENCOUNTER_ID,
  findEncounter,
  SCARECROW_BOSS_ENCOUNTER_ID,
  SMITHY_ENCOUNTER_ID,
  TUTORIAL_ENCOUNTER_ID,
} from '../combat/encounters.js';
import { CHAPTER_1_BEATS as B, CHAPTER_1_STORY } from '../data/story/chapter-1.js';
import {
  activeQuests,
  beatForEncounter,
  beatForItem,
  checkBeatCompletion,
  encounterGateState,
  isChapterComplete,
  levelGateState,
  lockedBuildings,
  pendingAutoDialog,
  selectDialog,
  StoryProgress,
} from './story-rules.js';

const NO_EVIDENCE = { wonEncounterIds: new Set<string>() };
const FEW_WORDS = { learned: 10, mastered: 0 };
const ALL_WON = new Set([TUTORIAL_ENCOUNTER_ID, FIELD_ENCOUNTER_ID, SMITHY_ENCOUNTER_ID, SCARECROW_BOSS_ENCOUNTER_ID]);

function progressOf(...beats: string[]): StoryProgress {
  return new StoryProgress(beats.map((beat) => ({ chapter: 1, beat })));
}

/** Toàn bộ chương theo một thứ tự hợp lệ. */
const FULL_ORDER = [
  B.awaken,
  B.gateImps,
  B.villageArrival,
  B.fieldCleared,
  B.chapelDoor,
  B.fragment1,
  B.fragment2,
  B.fragment3,
  B.chapelRestored,
  B.smithRescued,
  B.scarecrowDefeated,
  B.epilogue,
];

describe('chapter 1 data', () => {
  it('references only existing beats, dialogs and encounters', () => {
    const beatIds = new Set(CHAPTER_1_STORY.beats.map((beat) => beat.id));
    const dialogIds = new Set(CHAPTER_1_STORY.dialogs.map((dialog) => dialog.id));
    expect(beatIds.size).toBe(CHAPTER_1_STORY.beats.length);
    for (const beat of CHAPTER_1_STORY.beats) {
      expect(beat.requires.every((id) => beatIds.has(id))).toBe(true);
      if (beat.autoDialogId !== undefined) expect(dialogIds.has(beat.autoDialogId)).toBe(true);
      if (beat.completion.kind === 'battle') expect(findEncounter(beat.completion.encounterId)).toBeDefined();
    }
    for (const variant of CHAPTER_1_STORY.dialogs.flatMap((dialog) => dialog.variants)) {
      for (const id of [...(variant.requires ?? []), variant.unless, variant.completesBeat]) {
        if (id !== undefined) expect(beatIds.has(id)).toBe(true);
      }
      if (variant.startsEncounter !== undefined) expect(findEncounter(variant.startsEncounter)).toBeDefined();
      expect(variant.lines.length).toBeGreaterThan(0);
    }
    expect(CHAPTER_1_STORY.quests.flatMap((quest) => quest.beats).sort()).toEqual([...beatIds].sort());
  });

  it('only offers a beat or a story battle in dialog once its prerequisites are met', () => {
    // Thiếu điều kiện thì hội thoại mở thử thách/trận rồi server từ chối ghi mốc: người chơi làm uổng công.
    const beatRequires = new Map(CHAPTER_1_STORY.beats.map((beat) => [beat.id, beat.requires]));
    const gateRequires = new Map(CHAPTER_1_STORY.encounterGates.map((gate) => [gate.encounterId, gate.requires]));
    for (const variant of CHAPTER_1_STORY.dialogs.flatMap((dialog) => dialog.variants)) {
      const needed = [
        ...(variant.completesBeat === undefined ? [] : beatRequires.get(variant.completesBeat) ?? []),
        ...(variant.startsEncounter === undefined ? [] : gateRequires.get(variant.startsEncounter) ?? []),
      ];
      expect(variant.requires ?? []).toEqual(expect.arrayContaining(needed));
    }
  });

  it('can be played through in the documented order', () => {
    const done: string[] = [];
    for (const beat of FULL_ORDER) {
      expect(checkBeatCompletion(1, beat, progressOf(...done), { wonEncounterIds: ALL_WON, answer: 'door' })).toMatchObject({ ok: true });
      done.push(beat);
    }
    expect(isChapterComplete(1, progressOf(...done))).toBe(true);
    expect(isChapterComplete(1, progressOf(...done.slice(0, -1)))).toBe(false);
    // Xong chương 1 thì không còn nhiệm vụ chương 1 nào mở; chương 2 mới "bắt đầu" nên nhiệm vụ của nó hiện ra.
    const after = activeQuests(progressOf(...done));
    expect(after.every((view) => view.chapter !== 1)).toBe(true);
    expect(after.some((view) => view.chapter === 2)).toBe(true);
  });
});

describe('checkBeatCompletion', () => {
  it('rejects skipping ahead, unknown beats, unwon battles and wrong words', () => {
    expect(checkBeatCompletion(1, B.scarecrowDefeated, progressOf(B.awaken), NO_EVIDENCE)).toEqual({ ok: false, reason: 'prerequisites-missing' });
    expect(checkBeatCompletion(1, 'nope', progressOf(), NO_EVIDENCE)).toEqual({ ok: false, reason: 'unknown-beat' });
    expect(checkBeatCompletion(9, B.awaken, progressOf(), NO_EVIDENCE)).toEqual({ ok: false, reason: 'unknown-beat' });
    expect(checkBeatCompletion(1, B.gateImps, progressOf(B.awaken), NO_EVIDENCE)).toEqual({ ok: false, reason: 'battle-not-won' });
    const village = progressOf(B.awaken, B.gateImps, B.villageArrival);
    expect(checkBeatCompletion(1, B.chapelDoor, village, { ...NO_EVIDENCE, answer: 'dor' })).toEqual({ ok: false, reason: 'wrong-answer' });
    expect(checkBeatCompletion(1, B.chapelDoor, village, NO_EVIDENCE)).toEqual({ ok: false, reason: 'wrong-answer' });
    expect(checkBeatCompletion(1, B.chapelDoor, village, { ...NO_EVIDENCE, answer: ' Door ' })).toMatchObject({ ok: true });
  });
});

describe('dialogs', () => {
  it('opens the keeper intro automatically, then the epilogue after the boss', () => {
    expect(pendingAutoDialog(progressOf())?.script.id).toBe('keeper');
    expect(pendingAutoDialog(progressOf(B.awaken))).toBeNull();
    expect(pendingAutoDialog(progressOf(...FULL_ORDER.slice(0, -1)))?.variant.completesBeat).toBe(B.epilogue);
  });

  it('picks the variant that matches the story state', () => {
    expect(selectDialog('smith', progressOf(B.awaken, B.gateImps, B.villageArrival))?.variant.startsEncounter).toBe(SMITHY_ENCOUNTER_ID);
    expect(selectDialog('smith', progressOf(B.smithRescued))?.variant.startsEncounter).toBeUndefined();
    // Chưa hỏi chuyện dân làng: cửa nhà nguyện và thợ rèn chỉ có lời nhắc, không thử thách, không trận.
    const beforeVillage = progressOf(B.awaken, B.gateImps);
    expect(selectDialog('chapel-door', beforeVillage)?.variant.completesBeat).toBeUndefined();
    expect(selectDialog('smith', beforeVillage)?.variant.startsEncounter).toBeUndefined();
    expect(selectDialog('scarecrow', beforeVillage)).toBeNull();
    expect(selectDialog('chapel-altar', progressOf(B.fragment1))?.variant.completesBeat).toBeUndefined();
    expect(selectDialog('missing', progressOf())).toBeNull();
  });
});

describe('gates', () => {
  it('locks story battles until their prerequisites and closes them once won; roaming battles stay open', () => {
    expect(encounterGateState(TUTORIAL_ENCOUNTER_ID, progressOf())).toMatchObject({ open: false });
    expect(encounterGateState(TUTORIAL_ENCOUNTER_ID, progressOf(B.awaken))).toEqual({ open: true });
    expect(encounterGateState(TUTORIAL_ENCOUNTER_ID, progressOf(B.awaken, B.gateImps))).toBe('finished');
    const village = progressOf(B.awaken, B.gateImps, B.villageArrival, B.fieldCleared);
    expect(encounterGateState(FIELD_ROAM_ENCOUNTER_ID, village)).toEqual({ open: true });
  });

  it('locks levels by story beat and the chapter 2 gate by learned words', () => {
    expect(levelGateState('Misty_Fields', progressOf(B.awaken), FEW_WORDS)).toMatchObject({ open: false });
    expect(levelGateState('Misty_Village', progressOf(), FEW_WORDS)).toEqual({ open: true });
    const done = progressOf(...FULL_ORDER);
    expect(levelGateState('Ash_Forest', done, FEW_WORDS)).toMatchObject({ open: false, message: expect.stringContaining('10') as unknown });
    expect(levelGateState('Ash_Forest', done, { learned: 100, mastered: 0 })).toEqual({ open: true });
  });

  it('keeps the forge locked until the smith is rescued', () => {
    expect(lockedBuildings(progressOf()).has('forge')).toBe(true);
    expect(lockedBuildings(progressOf(B.smithRescued)).has('forge')).toBe(false);
  });

  it('does not lock the forge for players who already upgraded it', () => {
    // Người chơi cũ đã nâng lò rèn trên cấp gốc không bị khoá dù chưa có mốc truyện;
    // người mới ở cấp gốc (1) vẫn khoá theo mốc.
    expect(lockedBuildings(progressOf(), 2).has('forge')).toBe(false);
    expect(lockedBuildings(progressOf(), 1).has('forge')).toBe(true);
  });
});

describe('beat lookup and quests', () => {
  it('maps battles and chests to their beats', () => {
    expect(beatForEncounter(TUTORIAL_ENCOUNTER_ID, progressOf(B.awaken))?.beat.id).toBe(B.gateImps);
    expect(beatForEncounter(TUTORIAL_ENCOUNTER_ID, progressOf())).toBeNull();
    expect(beatForEncounter(FIELD_ROAM_ENCOUNTER_ID, progressOf(B.awaken, B.gateImps, B.villageArrival))).toBeNull();
    expect(beatForItem('holy-fragment-2')?.beat.id).toBe(B.fragment2);
    expect(beatForItem('nope')).toBeNull();
  });

  it('lists the open quests with progress', () => {
    expect(activeQuests(progressOf()).map((quest) => quest.objective)).toEqual(['Nói chuyện với Tu sĩ Giữ Thư']);
    const quests = activeQuests(progressOf(B.awaken, B.gateImps, B.villageArrival, B.chapelDoor, B.fragment1));
    expect(quests.map((quest) => quest.quest.id)).toEqual(['field', 'chapel', 'smith']);
    expect(quests[1]).toMatchObject({ done: 2, total: 5 });
  });
});
