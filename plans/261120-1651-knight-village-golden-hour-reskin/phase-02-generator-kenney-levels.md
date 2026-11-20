---
phase: 2
title: "Generator: atlas Kenney + 5 level làng"
status: completed
effort: "L (2 ngày)"
---

# Phase 2: Generator: atlas Kenney + 5 level làng

## Context

- Generator: `client/scripts/generate-chapter-1.mjs` (379 dòng). Hằng: `TILESET_REL_PATH` (16), `TILE_INDEX_FILE` (18), `ATLAS_COLUMNS = 8` (19), `ATLAS_MAX_PX = 2048` (21). Atlas dựng từ `DCSS_TILE_NAMES` (25) + `DERIVED_TILES` (32). Bố cục level dạng `LEGEND` ký tự (66) + `THEME` (92).
- Level spec: LEXHOLD 36x22, MISTY_FIELDS 44x24, MISTY_VILLAGE 40x24, MISTY_CHAPEL 30x20, SCARECROW_LAIR 34x22 — lệch `.ldtkl` (đều 800px = 25 ô) do commit 391a06c sửa tay.
- Test ràng buộc (`client/test/chapter-1-map.test.ts`): relPath `'../tilesets/chapter-1.png'`, grid 32, atlas ≤ 2048, kích thước 30–44 x 18–26, bảng entity, Torch ≥ 1, portal 2 chiều, Building 96x64, reachability.
- Demo tham chiếu bố cục: scratchpad `knight-town-compose.py` (chỉ số tile Tiny Town/Dungeon đã kiểm).

## Requirements

- **Giữ hợp đồng**: tên file atlas `chapter-1.png`, `chapter-1-tiles.json` (map tên → index), grid 32, cấu trúc layer (Entities, Collision, Decor, Ground), identifier level, entity (loại, số lượng, liên kết portal).
- Atlas mới: crop tile 16px từ 2 tilesheet Kenney, phóng nearest x2 thành 32px, đặt tên có nghĩa (vd `grass`, `grass_flowers`, `dirt_path`, `roof_orange_left`, `castle_wall`, `gate_left`, `well`, `fence_mid`, `banner_red`...). Chỉ đưa vào atlas tile thực dùng. Bảng tên → (sheet, index) là hằng có tên trong generator, không số trần rải rác.
- Chiều cao 5 level = 25 ô trong spec generator (đồng bộ với `.ldtkl` đã commit). Chiều rộng giữ nguyên.
- Bố cục làng hiệp sĩ cho từng level:
  - Lexhold: tường thành + tháp + cổng vòm phía trên, đường đất dọc, 4 Building (forge, arcane-tower, tailor, library) là nhà mái cam/xám 3x2 ô (96x64 khớp test), giếng, hàng rào, cây.
  - Misty_Fields: đồng cỏ, ruộng rào, đường đất nối 2 portal, bụi cây, bia tập bắn.
  - Misty_Village: làng nhỏ nhiều nhà, quảng trường giếng, 3 NPC.
  - Misty_Chapel: nhà nguyện đá (tile tường/sàn Tiny Dungeon), 3 rương.
  - Scarecrow_Lair: sân sau đổ nát / hầm (tile Tiny Dungeon), không khí tối hơn nhưng vẫn giờ vàng.
- Collision IntGrid sinh từ ô nhà/tường/cây/rào; Torch entity đặt ở cửa nhà, cổng thành (làm điểm sáng ấm).
- `__bgColor` level đổi sang màu nền cỏ/chiều tà (hằng có tên).
- Bỏ phụ thuộc atlas vào `assets/tiles/dcss/` cho chapter 1 (DCSS vẫn ở repo nếu sprite quái còn dùng — xem phase 4).
- Ghi thêm mặt nạ phát sáng: danh sách tên tile "cửa sổ/cửa/cổng" xuất ra `chapter-1-tiles.json` (vd khóa `glow`) để phase 3 dựng ánh sáng mà không hardcode index.

## Files

- Sửa: `client/scripts/generate-chapter-1.mjs` (tách module nếu > ~400 dòng: `client/scripts/chapter-1/kenney-atlas.mjs`, `client/scripts/chapter-1/levels.mjs`)
- Sinh lại: `assets/tilesets/chapter-1.png`, `assets/tilesets/chapter-1-tiles.json`, `assets/maps/chapter-1-misty-village/*.ldtkl` + project `.ldtk`
- Sửa nếu cần: `client/test/chapter-1-map.test.ts` (chỉ khi hợp đồng đổi có chủ ý — không nới ràng buộc để cho qua)

## Steps

1. Viết bảng tile Kenney có tên + hàm crop/scale x2, dựng atlas; kiểm atlas ≤ 2048.
2. Đổi `THEME`/`LEGEND` sang tile Kenney; giữ cơ chế ký tự để vẽ level.
3. Đổi chiều cao 5 spec thành 25, vẽ lại bố cục từng level; giữ entity và portal (dời tọa độ nếu cần, kiểm portal đối xứng `worldX/worldY`).
4. Xuất danh sách tile phát sáng.
5. `npm run generate:chapter-1` hai lần, `git diff --stat` lần 2 phải rỗng.
6. `npx vitest run client/test/chapter-1-map.test.ts client/test/battle-arena-layout.test.ts`.
7. Render ảnh xem trước từng level (script Python trong scratchpad đọc atlas + `.ldtkl`) để người dùng duyệt bố cục trước khi sang phase 4.

## Validation

- Test map + reachability xanh; atlas ≤ 2048; generator deterministic.
- Ảnh xem trước 5 level được người dùng duyệt.

## Risk

- Tên tile cũ (`mist_grass0`, `brick_dark0`...) sân trận đang dùng sẽ mất → `battle-arena-layout.test.ts` đỏ cho tới phase 4. Giảm: làm phase 4 bước sân trận ngay sau, hoặc giữ alias tạm trong cùng PR (không merge giữa chừng).
- E2E `battle-flow.ts:10`, `story-flow.ts:80` phụ thuộc tọa độ entity/quái lang thang → giữ tọa độ entity khi có thể.

## Rollback

- `git checkout` generator + file sinh; asset phase 1 không ảnh hưởng.
