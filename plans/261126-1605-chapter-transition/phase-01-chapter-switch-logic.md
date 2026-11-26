---
title: "Phase 1: Đổi chương giữa phiên và lúc vào game"
status: done
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Đổi chương giữa phiên và lúc vào game

## Bối cảnh (đã đọc)

- Boot nạp project ở `preload` (`client/src/scenes/boot-scene.ts:42`), đăng nhập, tải truyện (`loadStory`), rồi
  `scene.start(world)` không kèm data, nên world vào spawn `start` của level đầu.
- World đọc project từ registry `REGISTRY_KEYS.mapProject` (`world-scene.ts:167`); `preload` tự nạp `.ldtkl` và
  tileset của level (`:194`, `:421`), cache có namespace theo file map. Đổi project chỉ cần đặt lại registry.
- Cổng: `checkPortals` (`world-scene.ts:682`) khoá qua `story.canUsePortal` trước, rồi bỏ qua khi level không có
  trong project (`:696`).
- `isChapterStarted` (`shared/src/story/story-rules.ts:53`) chưa export; `highestUnlockedChapter` ở `level-curve.ts`.

## Files

- Modify `shared/src/story/story-rules.ts`: thêm `currentStoryChapter(progress, counts)` trả chương cao nhất đã bắt
  đầu theo truyện **và** đã mở theo số từ. Hàm mới, không đổi hàm cũ. Export qua `shared/src/index.ts`.
- Modify `client/src/maps/chapter-maps.ts`:
  - Thêm bảng `CHAPTER_ENTRIES` (chương → `{ levelId, spawnId }`): 1 `Lexhold/start`, 2 `Ash_Forest/from-lexhold`,
    3 `Saint_Catacomb/from-fields`, 4 `Hellmaw/from-fields`, 5 `Broken_Heaven/from-fields`.
  - Thêm `chapterOfLevel(levelId)`. Chọn cách không phải parse JSON mọi project lúc chạy (ví dụ bảng tĩnh có test
    đối chiếu với file map); ghi lý do trong code.
- Create `client/src/maps/chapter-project-loader.ts`: `loadChapterProject(scene, chapter): Promise<LoadedMapProject>`
  dùng loader của scene đang chạy (`load.json` và sự kiện complete), parse bằng `parseLdtkProject`.
- Modify `client/src/scenes/boot-scene.ts`: sau `loadStory` (và nhánh dev), tính `currentStoryChapter`. Khác chương
  đã nạp thì nạp project chương đó, gọi `setActiveChapter`, đặt registry, rồi `scene.start(world, CHAPTER_ENTRIES[n])`.
- Modify `client/src/scenes/world-scene.ts`: trong `checkPortals`, level đích không có trong project hiện tại mà
  `chapterOfLevel` tìm thấy thì fade, nạp project chương đó, đặt registry và `setActiveChapter`, rồi `scene.restart`
  với level và spawn đích. Không tìm thấy thì giữ hành vi cũ. Tách thành hàm riêng để `checkPortals` không quá dài.

## Steps

1. Viết test trước (đỏ):
   - `currentStoryChapter`: chưa xong chương 1 → 1; xong epilogue nhưng dưới 100 từ → 1; xong và đủ từ → 2.
   - `chapterOfLevel('Ash_Forest') === 2`, và bảng khớp với level thật trong mọi file map.
   - `CHAPTER_ENTRIES` trỏ level và spawn có thật.
2. Cài hàm thuần, test xanh.
3. Nối vào boot và world. Kiểm nhanh bằng dev: dev backend ở chương 1 nên boot vẫn vào Lexhold.
4. `npm run typecheck`, `npm run lint`, `npm test`.

## Success Criteria

- Test mới pass; `chapter-1.spec.ts` (e2e) không đổi hành vi với người chơi chương 1.
- Không đổi chữ ký hàm public đang có; `setActiveChapter` giờ có nơi gọi thật.

## Rollback

Revert commit phase; không có dữ liệu bị đổi.
