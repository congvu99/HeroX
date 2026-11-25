---
title: "Phase 7: Tường thành tháp cổng nhà nguyện"
status: done
priority: P2
effort: "3h"
dependencies: [4, 5]
---

# Phase 7: Tường thành, tháp, cổng, nhà nguyện

## Overview

Người dùng chốt gộp vào đợt này (2026-11-25). Chạy **sau phase 5, trước phase 6**. Dự kiến 3–4 lượt; chỉ chạy job khi
lượt còn lại ≥ số lượt job + 2 dự phòng, thiếu thì dừng hỏi (mua thêm hoặc bỏ bớt).

## Hiện trạng (đã xác minh)

- Tháp: con dấu 3×3 `TOWER` (`tower_top_*`, `tower_*`, `stone_slab`, `tower_base_*`) trong `client/scripts/chapter-1/levels.mjs`.
- Tường thành: ô lặp `castle_battlement`, `castle_wall` → phải **nối liền ngang** khi lặp.
- Cổng: `gate_arch_left/right` (vòm đóng), `gate_left/right` (cổng mở trên portal, có glow `GATE_*_GLOW`).
- Mặt tiền nhà nguyện `chapelFront()` rộng tuỳ ý, ghép từ `roof_grey_*`, `stone_wall_*`, `stone_window`, cổng vòm:
  dùng chung tên ô với nhà đá phase 4 → ảnh cắt từ một căn nhà không lặp ngang liền mạch được.

## Requirements

| Job | Cỡ | Thay ô | Lượt |
|---|---|---|---|
| `castle-tower` | 96×96 | 9 ô `TOWER` | 1 |
| `castle-gate` | 64×64 (2×2: vòm trên, cổng dưới) | `gate_arch_*`, `gate_*` | 1 |
| `castle-wall` | 32×64 (răng cưa + thân) | `castle_battlement`, `castle_wall` | 1 |
| `chapel-front` | 96×128 (mái 2 hàng, tường 2 hàng) | tên ô **mới** `chapel_*` thêm ở cuối `KENNEY_TILES` | 1 |

- Ô lặp ngang (`castle-wall`, cột giữa `chapel-front`) phải nối liền: kiểm mép trái/phải khớp; không khớp thì tự lật/
  ghép mép bằng code (`image-ops.mjs`), không sinh lại.
- `chapelFront()` đổi sang dùng `chapel_*` để không phụ thuộc ô nhà đá; giữ chữ ký hàm và vị trí cổng.
- Glow cổng mở và cửa sổ nhà nguyện đo lại theo ảnh mới.

## Implementation Steps

1. Đọc `/v2/balance`; tính lượt còn lại sau phase 5; xếp ưu tiên `castle-tower` → `castle-gate` → `chapel-front` → `castle-wall`.
2. Thêm 4 job vào file job công trình (helper `mapStructure` của phase 2).
3. Sinh từng job, xem ảnh sau mỗi lượt; hỏng thì dừng hỏi.
4. Thêm bảng ghi đè; đổi `chapelFront()` sang `chapel_*`.
5. Sinh lại map chương 1, chụp Lexhold (tường, tháp, cổng) và Misty_Chapel.

## Todo

- [x] `castle-tower` (ô giữa đổi tên `tower_mid` vì `stone_slab` còn là sàn nhà nguyện)
- [x] `castle-gate` 2×2 + vùng sáng; cổng bắc Lexhold thành cổng đóng 2 hàng, cổng nam thêm vòm đi xuyên được
- [x] `chapel-front` vẽ liền 12×4 ô (tên `chapel_front_<hàng>_<cột>`, lùi Kenney qua `chapel-front.mjs`); ảnh trả nền
      trắng đục → `clearBackground` (`clearEdgeBackground` trong `tools/lib/image-ops.mjs`)
- [x] Tường thành: đã làm bằng tileset Wang trước đó (`castle-wall-tileset`), không cần job `castle-wall`
- [x] Vùng sáng đo trên ảnh nguồn (`glowRects`), tự chia về từng ô; nhà cam/xám cũng chuyển sang cách này

Đã dùng 3 lượt, còn 2/40.

## Success Criteria

Lexhold và nhà nguyện hiện art mới, tường lặp không thấy đường nối, cổng mở vẫn sáng và đi qua được; test pass.

## Risk

- Hết lượt giữa chừng: ô nào chưa có ảnh thì lùi Kenney, Lexhold lẫn hai phong cách → ưu tiên tháp + cổng (nổi nhất).
