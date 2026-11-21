/**
 * Chọn project LDtk theo chương. Mỗi chương là một project riêng (không có cổng nối giữa các project);
 * game chơi lần lượt từng chương. Đây là nguồn duy nhất ánh xạ số chương → đường dẫn file map.
 */
import { CHAPTER_UNLOCKS, highestUnlockedChapter, type WordCounts } from '@herox/shared';
import { hasMapAsset } from './map-asset-urls';

/** Chương đầu tiên, luôn tồn tại và là mặc định khi chưa biết tiến độ người chơi. */
export const FIRST_CHAPTER = 1;

/**
 * Ánh xạ số chương → đường dẫn project (tính từ thư mục `assets/`). Chương 2–5 có thể trỏ tới file
 * chưa dựng; `resolveChapterMapPath` tự lùi về chương sẵn có nên không vỡ khi thiếu file.
 */
const CHAPTER_MAP_PATHS: Readonly<Record<number, string>> = {
  1: 'maps/chapter-1-misty-village.ldtk',
  2: 'maps/chapter-2-ash-forest.ldtk',
  3: 'maps/chapter-3-tide-harbor.ldtk',
  4: 'maps/chapter-4-ember-keep.ldtk',
  5: 'maps/chapter-5-star-spire.ldtk',
};

/** Danh sách chương có khai báo đường dẫn, tăng dần. */
const CHAPTER_NUMBERS: readonly number[] = Object.keys(CHAPTER_MAP_PATHS)
  .map(Number)
  .sort((a, b) => a - b);

/** Đường dẫn project của chương nếu file có trong bản build; `undefined` khi chưa dựng. */
export function chapterMapPath(chapter: number): string | undefined {
  const path = CHAPTER_MAP_PATHS[chapter];
  return path !== undefined && hasMapAsset(path) ? path : undefined;
}

/**
 * Đường dẫn project cho chương yêu cầu. Nếu file chương đó chưa dựng, lùi về chương sẵn có cao nhất
 * ≤ chương yêu cầu. Chương 1 luôn có nên hàm luôn trả về một đường dẫn hợp lệ.
 */
export function resolveChapterMapPath(requestedChapter: number): string {
  for (let chapter = requestedChapter; chapter >= FIRST_CHAPTER; chapter--) {
    const path = chapterMapPath(chapter);
    if (path !== undefined) return path;
  }
  const firstChapterPath = chapterMapPath(FIRST_CHAPTER);
  if (firstChapterPath === undefined) {
    // Chương 1 là bất biến của bản build; thiếu nó nghĩa là asset hỏng, báo rõ thay vì màn đen.
    throw new Error(`Thiếu map chương ${FIRST_CHAPTER} trong bản build`);
  }
  return firstChapterPath;
}

/** Chương cần tải khi người chơi đã có số liệu học từ: chương cao nhất đã mở theo `CHAPTER_UNLOCKS`. */
export function chapterForWordCounts(counts: WordCounts): number {
  return highestUnlockedChapter(counts);
}

/**
 * Seam cho phần nội dung chương đặt chương đang chơi trước khi boot tải map. Mặc định chương 1 vì ở
 * `preload` boot chưa có số liệu học từ (số liệu chỉ về sau khi xác thực). Dùng `CHAPTER_UNLOCKS` để
 * chặn giá trị vào đúng khoảng chương hợp lệ.
 */
let activeChapter = FIRST_CHAPTER;
const MAX_CHAPTER = CHAPTER_UNLOCKS[CHAPTER_UNLOCKS.length - 1]?.chapter ?? FIRST_CHAPTER;

/** Đặt chương đang chơi; giá trị ngoài khoảng hợp lệ bị kẹp về [1, chương lớn nhất]. */
export function setActiveChapter(chapter: number): void {
  const clamped = Math.min(Math.max(Math.floor(chapter), FIRST_CHAPTER), MAX_CHAPTER);
  activeChapter = clamped;
}

/** Chương đang chơi (mặc định chương 1 cho tới khi `setActiveChapter` được gọi). */
export function getActiveChapter(): number {
  return activeChapter;
}

/** Đường dẫn project của chương đang chơi, đã lùi về chương sẵn có nếu cần. */
export function activeChapterMapPath(): string {
  return resolveChapterMapPath(activeChapter);
}

/** Dùng cho test: liệt kê các chương có file map thật trong bản build. */
export function presentChapterMapPaths(): { readonly chapter: number; readonly path: string }[] {
  return CHAPTER_NUMBERS.flatMap((chapter) => {
    const path = chapterMapPath(chapter);
    return path === undefined ? [] : [{ chapter, path }];
  });
}
