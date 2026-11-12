---
phase: 10
title: "Chương 2–5"
status: pending
priority: P2
effort: "6d"
dependencies: [9]
---

# Phase 10: Chương 2–5

## Goal
Thêm 4 chương còn lại chỉ bằng dữ liệu, asset và map, không đổi hệ thống lõi. Chương nào cần cơ chế mới thì tách thành plan riêng.

Hành trình: từ làng bị chiếm, xuống dần địa ngục, rồi lên thiên đàng đổ nát.

| Chương | Vùng | Mở khi đã học | Chủ đề từ | Trùm | Cơ chế nhấn |
|---|---|---|---|---|---|
| 2 | Rừng Tro | 100 | thiên nhiên, động từ di chuyển | Hươu Quỷ Tro | kỹ năng di chuyển (lướt, dịch chuyển qua địa hình) |
| 3 | Hầm Mộ Thánh | 300 | đồ vật, nơi chốn | Giám Mục Mất Tên (undead) | danh từ triệu hồi, khiên |
| 4 | Vực Lửa (địa ngục) | 600 | công việc, cảm xúc | Chúa Quỷ Ngược Nghĩa | tính từ buff/debuff, cặp trái nghĩa |
| 5 | Thiên Cung Vỡ | 1000 + 200 đã thuộc | tổng hợp | Thiên Thần Sa Ngã Câm Lặng | trận cuối chỉ dùng từ đã thuộc |

Kết truyện: Thiên Thần Sa Ngã là hiệp sĩ Thánh Ngôn đời trước, bỏ ôn nên quên hết chữ và rơi xuống Vực Câm Lặng.

## Asset theo chương
Nguồn chính là PixelLab, cùng quy trình, recipe và bảng màu như phase 07 (`docs/art-direction.md`). DCSS, "Angels" và các gói CC chỉ là hình tạm hoặc phương án dự phòng.
- Chương 3 Hầm Mộ Thánh: trùm Giám Mục Mất Tên lấy đúng hình giám mục sa ngã cầm lư hương, vòng huyết đỏ trong ảnh mẫu; quái gồm giáo sĩ áo đỏ, xương kỵ sĩ, ghoul.
- Chương 4 Vực Lửa: tile địa ngục, dung nham; giữ tông đỏ và tím của bảng màu.
- Chương 5 Thiên Cung Vỡ: thiên thần, tile đá và mây trắng-vàng, tông "Thánh quang" `#fff1c2`.
- Gói trả phí chỉ dùng khi người dùng duyệt chi phí.

## Files to Create (mỗi chương)
- `assets/maps/chapter-N-*.ldtk`, `shared/data/story/chapter-N.ts`, `shared/data/enemies/chapter-N.ts`, fx bổ sung trong `fx-manifest.json`, `word-chains` theo chủ đề.
- Lexhold lên cấp theo chương (sprite + công trình cấp cao).

## Tasks
1. Làm và nghiệm thu từng chương riêng (thoại, playthrough, cân bằng), theo thứ tự 2 → 5.
2. Chủ đề từ dựa trên trường `source` của `public.words` nếu phân nhóm được; không thì chọn theo từ loại.

## Verification
- Mỗi chương: playthrough PC + iPhone, E2E rút gọn tới kết chương, test dữ liệu (beat liên kết đủ, encounter tồn tại, fx id có trong manifest, asset có credit).
