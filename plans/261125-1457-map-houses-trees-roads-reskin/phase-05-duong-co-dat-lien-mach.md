---
title: "Phase 5: Đường cỏ đất liền mạch"
status: done
priority: P2
effort: "4h"
dependencies: [3]
---

# Phase 5: Đường cỏ đất liền mạch

## Overview

Đường hiện là ô đất đặt cứng, mép vuông với cỏ. Làm đường có mép chuyển tiếp tự nhiên bằng tileset Wang của PixelLab
(`POST /v2/create-tileset`, 16 ô cỏ↔đất). Số lượt của endpoint này **chưa rõ** (tài liệu OpenAPI không ghi).

## Hiện trạng (đã xác minh)

- Ký tự `=` trong `levels.mjs` là `['dirt', 'dirt_pebble', 'dirt_tuft']`, `,`/`.` là cỏ, `R` là đá lát;
  `generate-chapter.mjs` rải biến thể theo `hashNoise` (biến thể đầu chiếm 70%).
- `api-client.mjs` chưa có hàm gọi `create-tileset` (endpoint chạy nền, phải poll `GET /v2/tilesets/{id}`).

## Requirements

- Thêm `createTileset()` vào `api-client.mjs` (gửi lower = cỏ, upper = đường đất, `view: 'high top-down'`, tile 16 px
  rồi ×2, hoặc 32 px theo độ hạt đã chốt), poll tới khi xong, timeout rõ ràng; lưu 16 ô vào `tiles/pixellab/road-grass-dirt.png`
  kèm bảng góc Wang của từng ô (từ response) ở JSON cạnh ảnh.
- Autotile trong máy sinh map: góc lưới là "đất" nếu **bất kỳ** ô kề góc đó là ô đường (`=`), ngược lại là cỏ; mỗi ô
  chọn ô tileset theo 4 góc. Đường rộng 1 ô vẫn hiện (mép tràn nhẹ sang cỏ kề).
- Nền cỏ ngoài trời đổi sang ô "toàn cỏ" của tileset để không lệch màu với mép đường; hoa/búi cỏ Kenney chỉ giữ nếu
  cùng tông, nếu không bỏ.
- Thêm tên ô mới ở **cuối** `KENNEY_TILES`; giữ tất định.
- Đá lát `R`, sàn nhà nguyện, hầm không đổi.

## Implementation Steps

1. Đọc `/v2/balance` (ghi số trước).
2. Viết `createTileset()` + job `road-grass-dirt`; chạy đúng 1 lần.
3. Đọc lại balance, ghi số lượt thực tế endpoint này tốn vào plan.md và `docs/art-direction.md`.
   Tốn > 2 lượt hoặc ảnh xấu → bỏ tileset, chuyển sang phương án dự phòng.
4. Autotile trong `generate-chapter.mjs` / `generate-chapter-1.mjs` (tách hàm chung, không chép logic hai nơi).
5. Test: lưới mẫu nhỏ (đường chữ L, đường 1 ô, ngã tư) → đúng chỉ số ô mong đợi; chạy lại hai lần ra cùng kết quả.
6. Sinh lại map chương 1, chụp Misty_Fields, Misty_Village.

## Phương án dự phòng (0 lượt)

Giữ ô Kenney, tự vẽ ô mép đường bằng code: lấy ô `dirt` + mặt nạ mép răng cưa theo `hashNoise` trộn với ô `grass`,
sinh 16 ô theo góc Wang trong `tools/lib/prop-painters.mjs`; dùng chung autotile ở bước 4.

## Todo

- [ ] `createTileset()` + poll
- [ ] Đo số lượt thực tế
- [ ] Autotile góc Wang (hàm chung)
- [ ] Nền cỏ đồng bộ
- [ ] Test autotile

## Success Criteria

Đường trên Misty_Fields/Misty_Village có mép chuyển tiếp, không còn mép vuông; map sinh lại tất định; test pass.

## Risk

- Bảng góc Wang trong response khác giả định → đọc schema `GET /v2/tilesets/{id}` trong OpenAPI trước khi code.
- Mép đường tràn lên ô portal/cửa nhà: ô đặc (nhà, tường) che bên trên ở layer Decor nên chấp nhận được; kiểm bằng ảnh.
