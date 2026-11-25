---
title: "Phase 2: Ảnh ghi đè ô atlas"
status: done
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Ảnh ghi đè ô atlas

## Overview

Thêm cơ chế để một tên ô trong atlas lấy ảnh từ file PixelLab thay cho ô Kenney, rồi khai báo job PixelLab cho ảnh
công trình. Chưa sinh ảnh nào (0 lượt). Khi file PixelLab chưa có, atlas lùi về ô Kenney nên map vẫn sinh được.

## Hiện trạng (đã xác minh)

- `client/scripts/chapter-1/kenney-atlas.mjs`: `KENNEY_TILES` là tên ô → `[sheet, chỉ số, glowRect?]`;
  `cropTile` cắt ô 16 px rồi `scaleNearest` ×2; `buildKenneyAtlas()` ghép atlas, đánh dấu `objectTiles` theo độ trong suốt.
- Chương 2–5 dùng chung `buildKenneyAtlas` qua `client/scripts/lib/generate-chapter.mjs`.
- Job PixelLab `kind: 'single'` ghi một PNG ra `assets/<path>` (`tools/pixellab/generate.mjs:242`), có `frameSize`
  tuỳ chọn; job khai báo trong `tools/pixellab/jobs.mjs` qua helper ở `job-factory.mjs`.
- Tên ô dùng ở `levels.mjs` các chương và `client/src/battle/battle-arena-layout.ts`; giữ nguyên tên thì không phải sửa nơi dùng.

## Requirements

- Bảng ghi đè mới (vd. `PIXELLAB_TILE_OVERRIDES` trong file mới `client/scripts/chapter-1/pixellab-tile-overrides.mjs`):
  mỗi mục = file nguồn trong `assets/`, lưới cắt (cột × hàng), danh sách tên ô theo thứ tự ô cắt, glow rect riêng (tuỳ chọn),
  và hệ số thu nhỏ trước khi ×2 (`sourceScale`: 1 = giữ độ nét gốc, 0.5 = thu nửa rồi ×2 cho cùng độ hạt Kenney).
- `buildKenneyAtlas` dùng ô từ bảng ghi đè nếu file tồn tại, ngược lại dùng ô Kenney. Không đổi thứ tự/chỉ số ô trong atlas
  (chỉ số là hợp đồng với file `.ldtkl`).
- Glow rect: lấy từ bảng ghi đè nếu có, ngược lại giữ glow cũ của tên ô.
- Helper job mới trong `job-factory.mjs`, vd. `mapStructure(id, file, prompt, { width, height, seed })`: ảnh tĩnh nền trong suốt,
  `view: 'high top-down'`, prompt bắt buộc `color-neutral palette`, `top-down 3/4 pixel art`, `clean readable silhouette`,
  `transparent background`, negative có `text, watermark, characters, strong color cast`; ghi ra `tiles/pixellab/<file>.png`.
- Job dành cho phase 3–4 (khai báo sẵn, chưa chạy): `house-orange` 96×96, `house-grey` 96×96, `tree-pine`,
  `tree-autumn`, `tree-cone-autumn` (cây 1 ô). Job phase 7 khai báo ở phase 7.

## Implementation Steps

1. Tìm helper có sẵn trước khi viết mới: `tools/lib/image-ops.mjs` (`crop`, `scaleNearest`, `hasTransparency`,
   `fitBottomCenter`) đủ để cắt/thu/phóng; cần thu nhỏ thì thêm `scaleDownNearest` vào đây nếu chưa có.
2. Viết bảng ghi đè + hàm `loadOverrideTiles()` trả `Map<tên ô, { image, glow? }>`; kiểm ảnh nguồn đúng cỡ lưới, sai thì báo lỗi rõ.
3. Sửa `buildKenneyAtlas` lấy ô ghi đè trước.
4. Thêm helper job + 5 job vào `tools/pixellab/jobs.mjs` (tách file `jobs-map-structures.mjs` nếu `jobs.mjs` dài).
5. Test Vitest: (a) không có file ghi đè → atlas giống hệt bản cũ (so byte PNG atlas chương 1); (b) có ảnh giả 96×96 →
   9 ô đúng vị trí, glow ghi đè có hiệu lực. Ảnh giả chỉ ở test, không lưu vào `assets/`.
6. `node tools/pixellab/generate.mjs --dry` liệt kê 5 job mới, ước 1 lượt mỗi job.

## Todo

- [ ] Bảng ghi đè + loader
- [ ] `buildKenneyAtlas` dùng ghi đè
- [ ] Helper `mapStructure` + 5 job
- [ ] Test atlas không đổi khi chưa có ảnh
- [ ] Test cắt ô + glow ghi đè

## Success Criteria

- `npm run generate:chapter-1 -w @herox/client` khi chưa có ảnh PixelLab ra đúng file cũ (`git status` sạch phần `assets/`).
- `npm run typecheck`, `npm run lint`, `npm test` pass.
- `--dry` hiện 5 job mới, không gọi API.

## Risk

- Đổi thứ tự `KENNEY_TILES` làm lệch chỉ số ô của mọi `.ldtkl` → chỉ thay ảnh, không thêm/xoá tên ô ở phase này.
