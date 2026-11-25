---
title: "map-houses-trees-roads-reskin"
description: "Vẽ lại nhà, cây, đường bản đồ thế giới bằng PixelLab, thay ô Kenney trong atlas chung cho 5 chương"
status: completed
priority: P1
effort: "M"
tags: [art, pixellab, map, tileset]
created: 2026-11-25
---

# map-houses-trees-roads-reskin

## Overview

Nhà (con dấu 3×3 ô), cây (1 ô), đường (ô đất mép vuông) đang là Kenney 16 px ×2, trông thô. Sinh ảnh PixelLab rồi
**cắt vào ô atlas cùng tên** (`client/scripts/chapter-1/kenney-atlas.mjs`), nên 5 chương và sân trận đổi theo mà không
sửa bố cục, va chạm hay id level. Đường làm bằng tileset Wang + autotile. Bối cảnh và so sánh phương án:
[brainstorm](../reports/brainstorm-261125-1453-map-houses-trees-roads-reskin.md).

**Ngân sách:** còn 12/40 lượt (đọc `/v2/balance` lúc 14:55 ngày 2026-11-25). Dự kiến ~10, dự phòng còn ~2.

| Phase | Lượt |
|---|---|
| 1 ảnh trước, 2 cơ chế ghi đè, 6 kiểm chứng | 0 |
| 3 pilot nhà mái cam (có cổng người dùng chốt) | 1 |
| 4 nhà đá + 3 cây | 4 |
| 5 tileset đường (số lượt chưa rõ; > 2 thì bỏ, dùng dự phòng 0 lượt) | 1? |
| 7 tháp, cổng, nhà nguyện, tường thành (chỉ chạy khi còn ≥ job + 2) | 3–4 |

**Thứ tự chạy:** 1 → 2 → 3 → 4 → 5 → 7 → 6 (phase 6 kiểm chứng chạy cuối).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Nhà, cây PixelLab thay ô Kenney cho cả 5 chương, vùng sáng cửa sổ đúng chỗ | P1 |
| 2 | Đường có mép chuyển tiếp cỏ↔đất tự nhiên | P2 |
| 3 | Không đổi id, toạ độ entity/portal; bố cục mới vẫn qua test đi lại; sinh map tất định | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Start](./phase-01-start.md) | Completed |
| 2 | [Phase 2: Ảnh ghi đè ô atlas](./phase-02-anh-ghi-de-o-atlas.md) | Completed |
| 3 | [Phase 3: Pilot nhà mái cam](./phase-03-pilot-nha-mai-cam.md) | Completed |
| 4 | [Phase 4: Nhà đá và cây](./phase-04-nha-da-va-cay.md) | Completed |
| 5 | [Phase 5: Đường cỏ đất liền mạch](./phase-05-duong-co-dat-lien-mach.md) | Completed |
| 6 | [Phase 6: Sinh lại map và kiểm chứng](./phase-06-sinh-lai-map-va-kiem-chung.md) | Completed |
| 7 | [Phase 7: Tường thành tháp cổng nhà nguyện](./phase-07-tuong-thanh-thap-cong-nha-nguyen.md) | Completed |
| 8 | [Phase 8: Bố cục tự nhiên](./phase-08-bo-cuc-tu-nhien.md) | Completed |

Phase 1 = chụp ảnh trước và chốt câu hỏi. 4 và 5 cùng phụ thuộc 3, sửa file khác nhau trừ bảng ô (`KENNEY_TILES`) → làm tuần tự.

## Non-goals

Hero, quái, nền trận, đồ vật nhỏ (rào, giếng, thùng), cây 2×2 ô. (Bố cục level đã đưa vào phạm vi ở phase 8 theo yêu
cầu người dùng; toạ độ/id entity vẫn giữ nguyên.)

## Thay đổi giữa chừng (người dùng, 2026-11-25)

- Phong cách: "như màn chiến đấu, fantasy" → prompt high fantasy, đổ bóng chi tiết; nền cỏ/đường/tường bằng tileset Wang.
- Bố cục tự nhiên → phase 8.
- Ngân sách thực tế: tileset v2 tốn 1 lượt/lần; phase 7 dùng 3 lượt, còn 2/40.

## Success Criteria

- [x] Atlas mới thay nhà/cây/đường cho cả 5 chương; chưa có ảnh PixelLab thì lùi về Kenney và ra đúng file cũ
- [x] Ảnh trước/sau Lexhold, Misty_Fields, Misty_Village trong `assets/` của plan
- [x] Vùng sáng cửa sổ/cửa khớp ở 3 preset ánh sáng (`sunset` ở làng chưa soi bằng mắt trong game, chỉ có test + ảnh dựng)
- [x] Sinh map hai lần ra cùng file; `.ldtk` chỉ đổi lớp tile
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass; credits và `docs/art-direction.md` cập nhật

## Quyết định đã chốt (người dùng, 2026-11-25)

1. Ngân sách: ~6 lượt cho nhà/cây/đường. Sau đó người dùng chọn gộp phase 7 (+3–4 lượt), nên dự phòng giảm còn ~2.
2. Cây giữ 1 ô, không đổi bố cục.
3. Gộp tường thành, tháp, cổng, nhà nguyện → phase 7.

## Risks

- Độ hạt lẫn lộn giữa ảnh PixelLab và Kenney còn lại → pilot so bản 96 px với 48→×2.
- Lớp MULTIPLY làm đục màu đậm → prompt ghi tông trung tính.
- Đổi thứ tự `KENNEY_TILES` làm lệch chỉ số ô `.ldtkl` → chỉ thay ảnh, tên mới thêm ở cuối.
- Vite không thấy asset mới → khởi động lại dev server sau mỗi lần thêm file.

<!-- slug: map-houses-trees-roads-reskin -->
