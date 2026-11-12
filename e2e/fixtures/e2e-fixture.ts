/**
 * Dữ liệu tổng hợp cho E2E: bộ từ, người dùng, phiên và tiến độ LingoBrain giả lập, cộng nhân vật HeroX.
 * Không phải dữ liệu người dùng thật; token chỉ có nghĩa trên DB thử do E2E tự dựng.
 */
import { FIELD_ENCOUNTER_ID } from '../../shared/src/combat/encounters.js';
import { STORY_CHAPTERS } from '../../shared/src/story/story-rules.js';
import type { StoryChapter } from '../../shared/src/story/story-types.js';

/** Tên project Playwright; mỗi project có bộ người dùng riêng để hai trình duyệt chạy song song không giẫm dữ liệu. */
export const E2E_PROJECT_NAMES = ['desktop-chrome', 'iphone-12'] as const;
export type E2eProjectName = (typeof E2E_PROJECT_NAMES)[number];

/** Mỗi nhóm spec dùng một người dùng riêng: trận đánh cộng vàng không làm lệch số vàng của spec lò rèn. */
export const PERSONA_PURPOSES = ['auth', 'typing', 'ring', 'forge', 'isolation', 'chapter'] as const;
export type PersonaPurpose = (typeof PERSONA_PURPOSES)[number];

export interface E2eDeckWord {
  readonly id: string;
  readonly word: string;
  readonly pos: string;
  readonly meaning: string;
  readonly emoji: string;
  readonly ipa: string;
}

export interface E2ePersona {
  readonly project: E2eProjectName;
  readonly purpose: PersonaPurpose;
  readonly username: string;
  /** Token phiên LingoBrain giả (base64url 20–200 ký tự như LingoBrain cấp). */
  readonly token: string;
  readonly heroName: string;
  readonly startGold: number;
  /** Seed sẵn `E2E_STORY_BEATS`; người dùng chơi chương 1 từ đầu thì không. */
  readonly seedsStoryBeats: boolean;
}

type WordSeed = readonly [word: string, meaning: string, emoji: string];

// Từ một âm tiết, chữ thường, không trùng nhau: gõ được trên mọi bàn phím, không phụ thuộc bộ gõ.
const WORDS_BY_POS: Readonly<Record<string, readonly WordSeed[]>> = {
  verb: [
    ['run', 'chạy', '🏃'], ['jump', 'nhảy', '🦘'], ['swim', 'bơi', '🏊'], ['read', 'đọc', '📖'],
    ['write', 'viết', '✍️'], ['sing', 'hát', '🎤'], ['cook', 'nấu', '🍳'], ['climb', 'leo', '🧗'],
    ['throw', 'ném', '🤾'], ['sleep', 'ngủ', '😴'], ['drink', 'uống', '🥤'], ['build', 'xây', '🧱'],
    ['paint', 'sơn', '🖌️'], ['dance', 'nhảy múa', '💃'], ['push', 'đẩy', '🫸'], ['pull', 'kéo', '🪢'],
  ],
  noun: [
    ['cat', 'con mèo', '🐈'], ['dog', 'con chó', '🐕'], ['tree', 'cái cây', '🌳'], ['house', 'ngôi nhà', '🏠'],
    ['river', 'dòng sông', '🏞️'], ['bread', 'bánh mì', '🍞'], ['sword', 'thanh kiếm', '🗡️'], ['shield', 'cái khiên', '🛡️'],
    ['castle', 'lâu đài', '🏰'], ['moon', 'mặt trăng', '🌙'], ['star', 'ngôi sao', '⭐'], ['key', 'chìa khoá', '🔑'],
    ['bridge', 'cây cầu', '🌉'], ['apple', 'quả táo', '🍎'], ['horse', 'con ngựa', '🐎'], ['crown', 'vương miện', '👑'],
  ],
  adjective: [
    ['big', 'to', '🐘'], ['small', 'nhỏ', '🐜'], ['hot', 'nóng', '🔥'], ['cold', 'lạnh', '🧊'],
    ['happy', 'vui', '😀'], ['sad', 'buồn', '😢'], ['brave', 'dũng cảm', '🦁'], ['dark', 'tối', '🌑'],
    ['bright', 'sáng', '💡'], ['strong', 'khoẻ', '💪'], ['quiet', 'yên lặng', '🤫'], ['tall', 'cao', '🦒'],
  ],
  adverb: [
    ['fast', 'nhanh', '⚡'], ['slowly', 'chậm rãi', '🐢'], ['often', 'thường xuyên', '🔁'], ['never', 'không bao giờ', '🚫'],
    ['always', 'luôn luôn', '♾️'], ['soon', 'sớm', '⏰'], ['here', 'ở đây', '📌'], ['away', 'đi xa', '🧳'],
  ],
  preposition: [
    ['on', 'trên', '📍'], ['under', 'dưới', '⬇️'], ['behind', 'phía sau', '🔙'], ['between', 'ở giữa', '↔️'],
    ['inside', 'bên trong', '📦'], ['near', 'gần', '🧲'], ['above', 'phía trên', '⬆️'], ['across', 'băng qua', '🌉'],
  ],
};

/** Bộ từ 60 từ theo thứ tự `sort_order`, id ổn định để spec và seed khớp nhau. */
export const E2E_DECK: readonly E2eDeckWord[] = Object.entries(WORDS_BY_POS).flatMap(([pos, seeds]) =>
  seeds.map(([word, meaning, emoji]) => ({ id: `e2e-${word}`, word, pos, meaning, emoji, ipa: `/${word}/` })),
);

/** Hash nội dung bộ từ giả; server chỉ dùng để biết khi nào nạp lại cache. */
export const E2E_DECK_CONTENT_HASH = 'e2e-deck-v1';

/**
 * Tiến độ LingoBrain giả: từ thứ 0..54 đã học (55 từ, đủ mốc 50 từ để nâng lò rèn lên cấp 2),
 * trong đó 12 từ đầu có khoảng ôn 30 ngày (≥ 21 ngày là "đã thuộc"); 5 từ cuối chưa học.
 */
export const LEARNED_WORD_COUNT = 55;
export const MASTERED_WORD_COUNT = 12;
const MASTERED_INTERVAL_DAYS = 30;
const LEARNING_INTERVAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Định dạng tiến độ LingoBrain HeroX đọc được (`progress.data.v`). */
const PROGRESS_FORMAT_VERSION = 1;

/** Vàng ban đầu của người dùng lò rèn: đủ nâng lên cấp 2 (100) nhưng không đủ cấp 3 (300). */
export const FORGE_PERSONA_GOLD = 150;

const TOKEN_PREFIX = 'herox-e2e-token';

function createPersona(project: E2eProjectName, purpose: PersonaPurpose): E2ePersona {
  return {
    project,
    purpose,
    username: `e2e-${project}-${purpose}`,
    token: `${TOKEN_PREFIX}-${project}-${purpose}`,
    heroName: `E2E ${purpose}`,
    startGold: purpose === 'forge' ? FORGE_PERSONA_GOLD : 0,
    seedsStoryBeats: purpose !== 'chapter',
  };
}

export const E2E_PERSONAS: readonly E2ePersona[] = E2E_PROJECT_NAMES.flatMap((project) =>
  PERSONA_PURPOSES.map((purpose) => createPersona(project, purpose)),
);

function isProjectName(value: string): value is E2eProjectName {
  return (E2E_PROJECT_NAMES as readonly string[]).includes(value);
}

/** Người dùng của một nhóm spec trong project Playwright đang chạy. */
export function personaFor(projectName: string, purpose: PersonaPurpose): E2ePersona {
  if (!isProjectName(projectName)) throw new Error(`Project Playwright lạ: ${projectName}`);
  return createPersona(projectName, purpose);
}

/** Dữ liệu `public.progress.data` cho người dùng E2E, mốc thời gian tính từ `nowMs` để lịch ôn luôn hợp lệ. */
export function buildProgressData(nowMs: number): unknown {
  const srs: Record<string, unknown> = {};
  for (const [index, word] of E2E_DECK.slice(0, LEARNED_WORD_COUNT).entries()) {
    const ivl = index < MASTERED_WORD_COUNT ? MASTERED_INTERVAL_DAYS : LEARNING_INTERVAL_DAYS;
    const last = nowMs - DAY_MS;
    srs[word.id] = {
      ef: 2.5,
      ivl,
      due: last + ivl * DAY_MS,
      state: 'review',
      reps: 3,
      lapses: 0,
      last,
      lastMode: 'type',
      sentences: [],
      hist: [{ t: last, g: 2, mode: 'type' }],
    };
  }
  return { v: PROGRESS_FORMAT_VERSION, srsEpoch: 0, srs };
}

/** Trận dùng cho E2E: vùng trận `ch1-field` trên map thử. */
export const E2E_ENCOUNTER_ID = FIELD_ENCOUNTER_ID;

export interface SeededStoryBeat {
  readonly chapter: number;
  readonly beat: string;
}

/** Thêm `beatId` cùng mọi mốc tiên quyết của nó (đệ quy) vào `into`. */
function addBeatWithPrerequisites(chapter: StoryChapter, beatId: string, into: Set<string>): void {
  if (into.has(beatId)) return;
  into.add(beatId);
  const beat = chapter.beats.find((candidate) => candidate.id === beatId);
  for (const required of beat?.requires ?? []) addBeatWithPrerequisites(chapter, required, into);
}

/**
 * Mốc truyện seed sẵn cho mọi persona: đủ để mở trận E2E và mọi công trình, không tự mở hội thoại đầu chương.
 * Tính từ dữ liệu chương nên đổi cổng truyện thì fixture đổi theo. Không gồm chính mốc của trận E2E:
 * mốc đó xong thì vùng trận đóng hẳn.
 */
export const E2E_STORY_BEATS: readonly SeededStoryBeat[] = STORY_CHAPTERS.flatMap((chapter) => {
  const beats = new Set<string>();
  const encounterGate = chapter.encounterGates.find((gate) => gate.encounterId === E2E_ENCOUNTER_ID);
  for (const required of encounterGate?.requires ?? []) addBeatWithPrerequisites(chapter, required, beats);
  for (const unlockBeat of Object.values(chapter.buildingUnlocks)) addBeatWithPrerequisites(chapter, unlockBeat, beats);
  return [...beats].map((beat) => ({ chapter: chapter.chapter, beat }));
});
