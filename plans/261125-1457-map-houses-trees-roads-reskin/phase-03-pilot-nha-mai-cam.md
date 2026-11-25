---
title: "Phase 3: Pilot nhà mái cam"
status: done
priority: P1
effort: "1h"
dependencies: [2]
---

# Phase 3: Pilot nhà mái cam

## Overview

Tiêu **1 lượt** sinh nhà mái cam 96×96, xem trong game ở 2 độ hạt, để người dùng chốt hướng trước khi tiêu thêm.

## Requirements

- Prompt nhà phải khớp khung 3×3 ô: mái chiếm khoảng 2 hàng trên, tường có cửa ở giữa hàng dưới, cửa sổ hai bên;
  không tràn mép, không bóng đổ ra ngoài khung, nhìn top-down 3/4 như nhà Kenney.
- Màu trung tính đủ sáng vì lớp ánh sáng MULTIPLY sẽ phủ màu theo preset.
- Xem ảnh bằng mắt trước khi nhận (pixflux hay ra lỗi: hình nghiêng, nền đen, mái lệch).

## Implementation Steps

1. Đọc `/v2/balance`; dưới 6 lượt thì dừng, hỏi người dùng.
2. `node tools/pixellab/generate.mjs house-orange --max-generations=1`.
3. Mở ảnh xem. Hỏng thì chỉ sinh lại khi người dùng đồng ý (đổi seed/prompt, tối đa 1 lần nữa).
4. Dựng atlas 2 bản trong thư mục tạm (không commit): `sourceScale: 1` và `sourceScale: 0.5`. Sinh map chương 1,
   khởi động lại Vite (glob không thấy file mới), chụp Lexhold + Misty_Village ở toạ độ phase 1.
5. Đưa người dùng 3 ảnh: trước, bản 96 px, bản 48→×2. Người dùng chọn hoặc loại.
6. Ghi quyết định (độ hạt, giữ/bỏ prompt) vào plan.md; chỉnh glow rect cửa sổ/cửa theo ảnh mới.

## Todo

- [ ] Sinh `house-orange` (1 lượt)
- [ ] So 2 độ hạt trong game
- [ ] Người dùng chốt
- [ ] Glow rect khớp cửa sổ/cửa mới

## Success Criteria

Người dùng chốt một trong: dùng bản 96 px, dùng bản 48→×2, hoặc dừng kế hoạch. `art-recipes.json` và `credits.json`
có mục `house-orange` (generate.mjs tự ghi); `node tools/build-credits.mjs` đã chạy.

## Gate

Phase 4–5 không chạy khi người dùng chưa chốt ở bước 5.
