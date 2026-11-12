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
- Chương 3–4: tile ngục, địa ngục từ DCSS (CC0) qua palette chung.
- Chương 5: thiên thần từ "Angels" (CC-BY, https://opengameart.org/content/angels); tile thiên đàng bằng cách đổi màu tile đá/mây sang trắng-vàng, kèm nền mây CC0 (kiểm license trước khi dùng). Được phép gói trả phí nếu người dùng duyệt chi phí.

## Files to Create (mỗi chương)
- `assets/maps/chapter-N-*.ldtk`, `shared/data/story/chapter-N.ts`, `shared/data/enemies/chapter-N.ts`, fx bổ sung trong `fx-manifest.json`, `word-chains` theo chủ đề.
- Lexhold lên cấp theo chương (sprite + công trình cấp cao).

## Tasks
1. Làm và nghiệm thu từng chương riêng (thoại, playthrough, cân bằng), theo thứ tự 2 → 5.
2. Chủ đề từ dựa trên trường `source` của `public.words` nếu phân nhóm được; không thì chọn theo từ loại.

## Verification
- Mỗi chương: playthrough PC + iPhone, E2E rút gọn tới kết chương, test dữ liệu (beat liên kết đủ, encounter tồn tại, fx id có trong manifest, asset có credit).
