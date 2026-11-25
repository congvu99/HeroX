---
title: "Phase 4: Nhà đá và cây"
status: done
priority: P1
effort: "2h"
dependencies: [3]
---

# Phase 4: Nhà đá và cây

## Overview

Sinh nhà đá mái xám và 3 loại cây theo phong cách đã chốt ở pilot. Dự kiến **4 lượt**.

## Requirements

- `house-grey`: cùng phong cách, seed lân cận và cỡ của `house-orange`; tường đá, mái xám, cửa sổ hai bên.
- Cây `tree-pine` (thay `tree_pine`), `tree-autumn` (thay `tree_autumn`), `tree-cone-autumn` (thay `tree_cone_autumn`).
  Người dùng chốt **giữ 1 ô**: sinh 32×32 (hoặc 64×64 rồi thu theo `sourceScale` đã chốt ở pilot), thay thẳng tên ô cũ,
  không đổi bố cục.
- `tree_cone_autumn_small`, `bush` giữ Kenney trừ khi người dùng muốn thay.

## Implementation Steps

1. Đọc `/v2/balance`; còn ít hơn số lượt cần + 2 dự phòng thì hỏi người dùng.
2. Sinh từng job một (`generate.mjs <id> --max-generations=1`), xem ảnh sau mỗi lượt; hỏng thì dừng hỏi, không tự sinh lại hàng loạt.
3. Thêm 4 mục vào bảng ghi đè; với nhà đá chỉnh glow rect.
4. Sinh lại map chương 1, khởi động lại Vite, chụp Misty_Fields (rừng) và Misty_Village.
5. Chạy `node tools/build-credits.mjs`.

## Todo

- [ ] `house-grey`
- [ ] `tree-oak`, `tree-pine`, `tree-autumn`
- [ ] Ghi đè + glow
- [ ] Ảnh kiểm trong game

## Success Criteria

4 ảnh được người dùng nhận; map chương 1 hiện nhà/cây mới; test pass; số lượt đã tiêu ghi vào plan.md.
