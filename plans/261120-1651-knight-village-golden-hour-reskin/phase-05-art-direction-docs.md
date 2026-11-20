---
phase: 5
title: "Docs art-direction"
status: completed
effort: "S (0.5 ngày)"
---

# Phase 5: Docs art-direction

## Context

- `docs/art-direction.md` đang mô tả gothic tối: bảng màu `#0b0a10`, lớp phủ tối, PixelLab là nguồn chính (dòng 44–52), độ phân giải cũ 640x360 (dòng 19).

## Requirements

- Viết lại các mục: phong cách (làng hiệp sĩ trung cổ, Kenney 16px x2), bảng màu giờ vàng (các hằng thực tế từ phase 3/4), cách trình bày ánh sáng (các thành phần, quality thấp tắt), độ phân giải 360x780 dọc, chính sách nguồn asset: Kenney CC0 là nguồn chính, asset mới phải cùng phong cách 16px x2; bỏ PixelLab khỏi vai trò nguồn chính; nhân vật LPC/DCSS hiện có ghi là ngoại lệ được giữ, credit/license CC0, cấm chạy palette-harmonize lên Kenney.
- Cách sửa map: chạy `npm run generate:chapter-1`, không sửa tay `.ldtkl` (nếu không sẽ bị ghi đè).
- Không chép lại chi tiết code; trỏ đến file nguồn.

## Files

- Sửa: `docs/art-direction.md`; kiểm `README.md` nếu có nhắc phong cách tối.

## Validation

- Mọi claim trong doc khớp code (đường dẫn file, hằng số, lệnh).
