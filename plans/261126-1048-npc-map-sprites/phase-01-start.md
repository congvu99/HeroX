---
title: "Phase 1: Nối hình NPC trên bản đồ"
status: done
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Nối hình NPC trên bản đồ

## Overview

Thêm 8 `dialogId` còn thiếu vào bảng hình NPC trên bản đồ, trỏ vào ảnh đã có. Tách bảng ra module thuần để test đọc
được mà không kéo Phaser vào, rồi thêm test quét mọi map chương. Không tốn lượt PixelLab.

## Bối cảnh (đã đọc)

- `client/src/render/prop-sprites.ts:9` bảng `NPC_SPRITES`, chỉ có 6 khoá chương 1. `npcTextureKey()` rơi về
  `TEXTURE_KEYS.npc` khi thiếu khoá.
- `prop-sprites.ts` import `battle-actors.ts`, file này import `phaser` lúc chạy nên test Vitest không import thẳng được.
- `client/test/chapter-1-map.test.ts:66` có `loadChapter()` và `presentChapterMapPaths` (`client/src/maps/chapter-maps`):
  dùng lại cách nạp map này, không viết bộ đọc LDtk mới.
- Ảnh trùm làm NPC dùng chung khoá texture với trận qua `textureKeyFor()`; giữ nguyên cơ chế này.

## Files

- Create: `client/src/render/npc-sprite-paths.ts`: bảng `dialogId → đường dẫn ảnh` (không import Phaser).
- Modify: `client/src/render/prop-sprites.ts`: import bảng từ module mới, bỏ bảng cũ.
- Create: `client/test/npc-sprite-paths.test.ts`.

## Implementation Steps

1. Chuyển `NPC_SPRITES` sang `npc-sprite-paths.ts` (export hằng, JSDoc 1 dòng). Giữ comment "cánh cửa, bàn thờ cũng
   là NPC vì có hội thoại".
2. Thêm 8 khoá:
   - `ash-warden` → `sprites/npc/forest-warden.png` (comment ngắn: dialogId trên map khác id speaker).
   - `crypt-warden`, `chained-soul`, `gate-seraph` → `sprites/npc/<id>.png` (phase 2 đổi 2 khoá sau).
   - `ash-stag`, `nameless-bishop`, `antonym-demon`, `fallen-angel` → `sprites/monsters/<id>.png`.
3. `prop-sprites.ts` dùng bảng mới; `queuePropSprites` và `npcTextureKey` giữ chữ ký, hành vi cũ.
4. Test `npc-sprite-paths.test.ts`:
   - Nạp mọi map chương có trên đĩa (theo cách `chapter-1-map.test.ts`), gom mọi `Npc.dialogId`.
   - Mỗi `dialogId` có khoá trong bảng, và file `assets/<path>` tồn tại.
   - Chạy test trước khi thêm khoá ở bước 2 để thấy nó đỏ với đúng 8 id (chứng minh test bắt được lỗi), rồi mới thêm.

## Todo

- [x] Module bảng hình NPC thuần
- [x] 8 khoá mới
- [x] Test quét map: đỏ trước, xanh sau

## Success Criteria

- `npx vitest run client/test/npc-sprite-paths.test.ts` pass; lần chạy đỏ trước đó liệt kê đúng 8 `dialogId` ở bảng plan.md.
- `npm run typecheck` và `npm run lint` không lỗi.
- Không đổi file map, không đổi `dialog-runner.ts`.

## Rollback

Revert commit của phase; không có dữ liệu hay asset bị ghi đè.
