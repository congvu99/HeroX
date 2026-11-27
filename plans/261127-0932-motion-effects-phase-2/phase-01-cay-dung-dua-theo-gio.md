---
title: "Phase 1: Cây đung đưa theo gió (sprite + tween sway)"
status: done
---

# Phase 1: Cây đung đưa theo gió

## Overview

Tách tile cây (`tree_*`, index 7–10 ở chương 1) khỏi tilemap tĩnh, vẽ lại thành sprite riêng, nghiêng nhẹ qua lại theo gió bằng tween — để tán cây "sống". Cách đã chốt: **sprite riêng + tween sway** (KISS, không shader). Lọc theo `tileIndex` ở tầng scene, **không sửa `ldtk-loader.ts`**.

## Context (đã xác minh)

- Tile cây nằm trong `MapTileLayer.tiles` với `tileIndex`, `cellX/cellY`, `flipX/Y`, `alpha` (`ldtk-loader.ts:54-78`). Tên→index trong `assets/tilesets/chapter-N-tiles.json`; chương 1: `tree_pine=7, tree_autumn=8, tree_cone_autumn=9, tree_cone_autumn_small=10` (scout).
- Atlas nạp theo tileset uid, key `ldtk-tileset:${mapPath}:${uid}` (`world-scene.ts:122`). Tile vẽ qua `putTileAt(firstgid + tileIndex)` (`ldtk-tilemap-builder.ts:48`).
- `createProps` trong `world-scene.ts` đã có mẫu tạo sprite từ entity (xem quanh dòng 242); tham khảo cách add sprite + depth theo y chân.
- Depth: layer nền `-1000 + layerOrder`; sprite dùng `depth = y chân`. Cây giữ dưới hero (mặc định) nghĩa là depth theo gốc cây.

## Requirements

- [x] Hàm thuần `treeTilesInLayers(layers, treeIndices): {cellX, cellY, tileIndex, flipX, flipY}[]` — quét mọi `stackIndex`, trả danh sách ô cây. Test tách khỏi Phaser.
- [x] Bảng `treeIndicesFor(tileNameIndex)` suy từ `chapter-N-tiles.json`: mọi tên bắt đầu `tree_` → tập index. Không hardcode 7–10 (chương khác khác index).
- [x] Ở scene: với mỗi ô cây, **ẩn tile đó trên tilemap** (hoặc không vẽ) và thêm một `Image` tại tâm ô dùng cùng atlas/frame; giữ `flipX`.
- [x] Sway: tween `angle` biên độ nhỏ (vài độ) quanh gốc tán (origin dưới), yoyo repeat, **lệch pha** giữa các cây (offset theo hash cell như `pickVariant`). Gốc cây gần như đứng yên, ngọn nghiêng.
- [x] Guard quality: `ambientWeatherEnabled === false` hoặc `disable()` → cây tĩnh (dừng tween, giữ hình). Nhiều cây → giới hạn/stagger để không tạo quá nhiều tween.
- [x] Không che hero sai: giữ depth như tile cũ (dưới hero) trừ khi chốt khác ở review.

## Implementation Steps

1. Tạo `client/src/render/tree-sway.ts` (thuần): `treeIndicesFor`, `treeTilesInLayers`. Viết test phủ: lọc đúng index, bỏ ô không phải cây, nhiều stackIndex, input rỗng.
2. Trong `world-scene.ts` sau khi `buildLevelTilemap`: lấy tile cây, với mỗi ô `tilemapLayer.removeTileAt` (hoặc set `setVisible`/alpha 0 cho tile đó) rồi `this.add.image(centerX, bottomY, atlasKey, frame).setOrigin(0.5, 1)`.
3. Thêm tween sway cho mỗi image: `this.tweens.add({ targets, angle: {from:-AMP,to:+AMP}, duration, yoyo:true, repeat:-1, delay: phaseFromCell })`. Constant `TREE_SWAY_ANGLE`, `TREE_SWAY_MS`.
4. Lưu danh sách tween/image để dọn khi SHUTDOWN và dừng khi quality tắt (subscribe như atmosphere).
5. Kiểm tay: Lexhold/làng/rừng thấy cây nghiêng nhẹ, lệch pha; hero đi qua gốc che đúng; `low` thì tĩnh.

## Todo

- [x] `tree-sway.ts` thuần + test
- [x] Tách tile cây khỏi tilemap, dựng sprite tại đúng ô (giữ flipX, origin đáy)
- [x] Tween sway lệch pha; constant biên độ/tần số; guard quality + dọn khi shutdown
- [x] Kiểm tay vài level + typecheck/lint/test xanh

## Success Criteria

- Cây nghiêng nhẹ theo gió, lệch pha, gốc đứng yên; không giật, không che hero sai.
- `low`/`disable()`: cây tĩnh, không lỗi, không rò tween.
- Không sửa `ldtk-loader.ts`; test loader/map hiện có không hỏng.

## Rủi ro & Rollback

- Rủi ro: nhiều cây → nhiều sprite/tween, tụt fps → giới hạn số tween hoạt động, tắt theo `particleDensity`. Sai depth che hero → giữ depth gốc, chỉ xoay quanh origin đáy.
- Rollback: bỏ bước tách cây (giữ tile trên tilemap như cũ), xoá `tree-sway.ts` và lời gọi.

## Kết quả thực thi (2026-11-27)

- `client/src/render/tree-sway.ts` (thuần: `treeIndicesFor`, `treeTilesInLayers`, `swayPhase`, `swayAngle`) + `tree-sway.test.ts`.
- `client/src/render/chapter-tile-names.ts`: bảng tên tile theo atlas `chapter-N.png` cho mọi chương (glob `chapter-*-tiles.json`); tileset khác (placeholder, test-room) bỏ qua.
- `client/src/render/swaying-trees.ts`: gỡ ô cây khỏi tilemap (`removeTileAt`), thêm `Image` cùng frame cắt từ atlas, origin đáy, giữ flip/alpha/depth layer gốc (dưới hero).
- **Đổi so với bước 3–4 ở trên:** sway dùng **một vòng POST_UPDATE** tính `swayAngle` thay vì một tween mỗi cây (Misty_Fields có 354 cây). Cây ngoài khung nhìn (+64 px) bị ẩn và không tính góc, vì image không tự cull theo camera như tilemap.
- `disable()` (quality tắt `ambientWeatherEnabled`): đặt tile cây lại vào tilemap (`putTileAt` kèm flip/alpha) rồi huỷ image, chi phí về như chưa bật. Kiểm tay Lexhold: Decor 73 + 130 cây = 203 ô, đúng số gốc.
- Test Phaser giả: `client/test/swaying-trees.test.ts` (tách đúng ô, bỏ qua atlas khác / thiếu layer, cull, `disable()` khôi phục tile).
- `ldtk-tilemap-builder.ts`: chỉ tách hàm `tilemapLayerName` (export mới, hành vi giữ nguyên). Không sửa `ldtk-loader.ts`.
- Kiểm tay (Vite 5180, headless 400×1040): Lexhold 130 cây, Misty_Village 258, Misty_Fields 354 nghiêng lệch pha, 60 fps headless (chưa đo trên iPhone); đổi level không rò listener.
