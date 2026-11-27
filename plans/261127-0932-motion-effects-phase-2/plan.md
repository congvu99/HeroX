---
title: "GĐ2 — Hiệu ứng chuyển động đụng LDtk/tileset"
description: "Cây đung đưa theo gió (sprite riêng + tween sway), parallax nền, animated tiles nước/cỏ; phần đụng asset/LDtk mà GĐ1 cố tránh."
status: in-progress
priority: P2
effort: "M-L"
tags: [herox, client, phaser, vfx, ldtk, tileset]
created: 2026-11-27
---

# GĐ2 — Hiệu ứng chuyển động đụng LDtk/tileset

## Overview

GĐ1 đã thêm hạt môi trường, đuốc cháy, camera bob/punch mà không đụng LDtk/tileset (xem `plans/261127-0911-motion-effects-phase-1/`). GĐ2 làm phần khó còn lại — cây cối, nền, mặt nước/cỏ chuyển động — vốn phải chạm tới dữ liệu map và ảnh tileset.

Ba trục, xếp theo rủi ro/chi phí tăng dần. **A rẻ nhất, không cần art mới**; **C cần asset nền hoặc chấp nhận parallax nhẹ trên layer sẵn có**; **B tốn art nhất** (atlas chưa có tile nước, LDtk chưa khai báo animated tile).

## Phát hiện khi scout (đã xác minh)

- Cây là tile `tree_*` (index 7–10 ở chương 1, tên trong `assets/tilesets/chapter-N-tiles.json`) **nằm lẫn trong layer `Decor`**, không tách riêng (`ldtk-loader.ts` giữ `MapTile{cellX,cellY,tileIndex,flipX,flipY,alpha}`, mất toạ độ sub-ô `px`). Lọc theo `tileIndex` được mà **không cần đổi loader**.
- LDtk **không khai báo animated tile**: `tags`/`enumTags`/`customData` rỗng (`chapter-1-misty-village.ldtk:706-726`); loader cũng không đọc các trường này. Muốn animated tile phải tự định nghĩa cơ chế frame ngoài LDtk.
- Atlas `chapter-N.png` (256×640, grid 32, 8×20 ô) **không có tile nước** (tên chỉ grass/path/tree/bush...). Trục B cần **vẽ thêm tile nước + khung động**.
- **Không có hệ parallax chung, không có layer ảnh nền riêng**: nền chỉ là `backgroundColor` (`world-scene.ts:243`) + layer tile `Ground`/`Decor`. Tia nắng của atmosphere đã tự parallax (`golden-hour-atmosphere.ts:266`) — mẫu tham khảo.
- Phaser `TilemapLayer` **không animate tile sẵn**; sway/animation phải qua sprite riêng hoặc đổi tile định kỳ.
- Layer tiền tố `Overhead*` vẽ đè hero (`ldtk-tilemap-builder.ts:5,119`) — hiện **chưa map nào dùng**; cây đang vẽ dưới hero (depth `-1000 + layerOrder`).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Tán cây trên map đung đưa nhẹ theo gió, không che/không giật hero, tắt theo quality | P2 |
| 2 | Nền map có chiều sâu parallax nhẹ khi camera di chuyển | P3 |
| 3 | Mặt nước/cỏ có khung động (animated tiles) ở nơi phù hợp | P3 |

## Phases

| # | Phase | Status | Phụ thuộc |
|---|-------|--------|-----------|
| 1 | [Phase 1: Cây đung đưa theo gió (sprite + tween sway)](./phase-01-cay-dung-dua-theo-gio.md) | Done | — |
| 2 | [Phase 2: Parallax nền map](./phase-02-parallax-nen-map.md) | Done | — |
| 3 | [Phase 3: Animated tiles nước/cỏ](./phase-03-animated-tiles-nuoc-co.md) | Blocked (chờ art nước) | Art tile nước |

P1, P2 độc lập (file ownership khác nhau), chạy song song được. P3 có **điều kiện tiên quyết là art** (tile nước mới trong tileset) — nếu chưa có art thì dừng ở thiết kế cơ chế + cỏ (dùng tile cỏ sẵn có), phần nước chờ asset.

## Kiến trúc & nguyên tắc ràng buộc

- **Tái dùng hạ tầng GĐ1**: guard theo `QualityProfile` (`ambientWeatherEnabled`/`particleDensity`/`screenShakeEnabled`) và `disable()` như hạt sẵn có. Parallax dùng mẫu `tilePositionX = scrollX * factor` của atmosphere.
- **Không phá base loader/builder**: ưu tiên không đổi `ldtk-loader.ts` (test Node phụ thuộc). Trục A lọc tile cây từ `MapTileLayer.tiles` ở tầng scene, không sửa loader. Nếu một trục buộc đổi loader (vd cần `src`/`px` tinh) thì hỏi trước (mục 4 chuẩn senior).
- **Không đổi contract LDtk hiện có**: không bắt map cũ phải thêm layer/entity mới để chạy được; tính năng mới là tùy chọn, map chưa có vẫn render như cũ.
- **Tinh tế**: biên độ sway/parallax nhỏ, không gây say xe, không che nhân vật, không phân tâm khi gõ từ.
- **Asset mới phải vào bản build**: `map-asset-urls.ts` dùng `import.meta.glob`; thêm tile/ảnh mới phải restart Vite (ghi trong memory).

## Extension trace

Seam chia sẻ tiềm năng của GĐ2 là **cách nhận diện "tile đặc biệt" theo index** (cây ở P1, cỏ/nước ở P3). Hợp đồng giữ ổn định: một bảng `tileIndex → vai trò` suy từ `chapter-N-tiles.json` (đã có tên tile), hàm thuần `specialTilesInLayer(layer, roleIndices)` trả danh sách ô. Thêm chương mới chỉ cần tên tile đúng quy ước trong JSON, không sửa code nhận diện. Một ca thật (cây) là đủ để dựng seam; cỏ/nước ở P3 là ca thứ hai chứng minh seam tái dùng. **Không** dựng registry/plugin — chỉ bảng tra + hàm lọc thuần, test được tách khỏi Phaser.

## Success Criteria

- [ ] Cây trên map (Lexhold/làng/rừng) nghiêng nhẹ qua lại theo nhịp, lệch pha giữa các cây; đứng cạnh không thấy giật; hero đi qua không bị che sai.
- [ ] Nền map cuộn chậm hơn lớp chơi tạo chiều sâu; không lộ mép, không rớt fps rõ.
- [ ] Mặt nước/cỏ ở nơi có tile phù hợp chuyển khung mượt (hoặc, nếu chưa có art nước, cơ chế đã sẵn và cỏ động chạy được).
- [ ] Mọi hiệu ứng tắt ở profile `low`/`disable()`; game vẫn đọc rõ.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` xanh; test map/loader hiện có không hỏng.

## Mở / cần quyết định khi thực thi

- P1: cây chuyển sang sprite riêng — có đặt lên `Overhead` (đè hero khi hero đứng sau gốc) hay giữ dưới hero? Mặc định giữ hành vi hiện tại (dưới hero) để KISS; xác nhận khi review.
- P3: có bổ sung tên `water` vào `chapter-N-tiles.json` và vẽ tile nước mới không? Chưa có art thì P3 giới hạn ở cỏ + cơ chế.

<!-- slug: motion-effects-phase-2 -->
