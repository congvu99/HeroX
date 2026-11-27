---
title: "Phase 3: Animated tiles nước/cỏ"
status: todo
---

# Phase 3: Animated tiles nước/cỏ

# ⚠ Điều kiện tiên quyết: ART

Atlas `chapter-N.png` **chưa có tile nước** và **không có khung động nào**. Phần **nước** của phase này chỉ làm được sau khi có art: tile nước + ≥2 khung động vẽ vào tileset, đặt tên `water*` trong `chapter-N-tiles.json`. Nếu chưa có art khi tới phase này: **dừng ở cơ chế + cỏ** (dùng tile cỏ sẵn có nếu có nhiều biến thể), phần nước chờ asset. Xác nhận với người dùng.

## Overview

Cho mặt nước/cỏ chuyển khung (animated tiles). LDtk không khai báo animation và loader không đọc customData, nên cơ chế frame **tự định nghĩa ngoài LDtk**: bảng `tileIndex → [khung]` + bộ đổi khung định kỳ trên tilemap. Tái dùng seam nhận diện tile theo index của P1.

## Context (đã xác minh)

- Phaser `TilemapLayer` không animate tile sẵn; đổi khung = `putTileAt(frameIndex, x, y)` định kỳ, hoặc vẽ sprite riêng cho ô động (như cây P1).
- Loader giữ `tileIndex` theo ô; seam `treeTilesInLayers` của P1 tổng quát hoá được thành `specialTilesInLayer(layer, indices)`.
- Atlas 8×20 ô; khung động phải nằm trong atlas (thêm ô mới = sửa `chapter-N.png` + regenerate `chapter-N-tiles.json` qua `client/scripts/generate-chapter-1.mjs`).

## Requirements

- [ ] Tổng quát hoá seam P1: hàm thuần `specialTilesInLayer(layer, roleIndices)` + bảng `animatedTileFramesFor(tileNameIndex)` trả `Map<baseIndex, frameIndices[]>` suy từ tên (vd `water`, `water_2`, `water_3` → chuỗi khung của `water`). Test tách khỏi Phaser.
- [ ] Bộ đổi khung: với mỗi ô động, luân phiên `putTileAt` theo `ANIM_FRAME_MS`, lệch pha theo cell để mặt nước không nhấp nháy đồng loạt.
- [ ] Guard quality: `ambientWeatherEnabled === false`/`disable()` → dừng đổi khung (giữ khung 0). Giới hạn số ô động cập nhật mỗi khung ở máy yếu.
- [ ] Không đổi `ldtk-loader.ts`. Nước: chỉ bật khi atlas có tile `water*`; không có thì bỏ qua êm (map cũ không hỏng).

## Implementation Steps

1. Tách `tree-sway.ts` (P1) phần lọc thành `special-tiles.ts` thuần dùng chung (seam); `tree-sway` import lại. Thêm `animatedTileFramesFor` + test.
2. Trong scene: tìm ô động, tạo bộ timer đổi khung (`this.time.addEvent` hoặc cập nhật trong `update` theo mod thời gian), lệch pha theo hash cell.
3. Guard quality + dọn timer khi SHUTDOWN.
4. Kiểm tay: nơi có tile nước/cỏ động thấy khung đổi mượt, lệch pha; `low` thì đứng khung.

## Todo

- [ ] Tách seam `special-tiles.ts` dùng chung với P1; `animatedTileFramesFor` + test
- [ ] Bộ đổi khung tilemap lệch pha; guard quality + dọn timer
- [ ] (Khi có art) thêm tile nước + khung vào atlas, regenerate JSON
- [ ] Kiểm tay + typecheck/lint/test xanh

## Success Criteria

- Mặt nước/cỏ ở nơi có tile phù hợp đổi khung mượt, lệch pha.
- Nếu chưa có art nước: cơ chế sẵn, cỏ động chạy được (nếu có biến thể), nước chờ asset — ghi rõ.
- `low`/`disable()`: đứng khung. Không sửa loader; map cũ không hỏng.

## Rủi ro & Rollback

- Rủi ro chính: **thiếu art** → phase bị chặn một phần (đã nêu ở đầu). Đổi khung nhiều ô → giới hạn/lệch pha, tắt theo quality.
- Rollback: gỡ bộ đổi khung và lời gọi; tile giữ khung tĩnh như cũ.
