# Brainstorm: vẽ lại nhà, cây, đường trên bản đồ bằng PixelLab

Ngày 2026-11-25. Ngân sách PixelLab đọc trực tiếp từ `/v2/balance`: **còn 12/40 lượt** (gói trial, 0 USD credit).

## Hiện trạng (đã xác minh)

- Map mọi chương dựng từ một atlas Kenney Tiny Town/Dungeon 16 px phóng ×2 lên ô 32 px:
  `client/scripts/chapter-1/kenney-atlas.mjs` (bảng `KENNEY_TILES`), chương 2–5 dùng lại qua
  `client/scripts/lib/generate-chapter.mjs`. Thay ô trong atlas là đổi cho cả 5 chương và sân trận làng.
- Nhà là con dấu 3×3 ô (`HOUSE_ORANGE`, `HOUSE_GREY` trong `client/scripts/chapter-1/levels.mjs:~70`):
  mái, mái hiên, tường có cửa/cửa sổ; cửa sổ/cửa có vùng phát sáng (`WINDOW_GLOW`, `DOOR_GLOW`). 14 lần dùng `house(...)`.
- Cây: 4 loại 1 ô (`tree_pine`, `tree_autumn`, `tree_cone_autumn`, `_small`), nền trong suốt, vẽ ở layer Decor.
- Đường: ô `dirt`, `dirt_pebble`, `dirt_tuft`, `cobble` đặt cứng, không có ô chuyển tiếp cỏ↔đất (mép vuông).
- API PixelLab (OpenAPI v2): `create-image-pixflux` 1 lượt/ảnh (≤ 400×400, nền trong suốt);
  `create-tileset` sinh 16 ô Wang cỏ↔đường liền mạch (ô 16/24/32 px), **chưa rõ tốn bao nhiêu lượt**;
  `create-1-direction-object` tốn 10–25 lượt/lần → loại.

## Hợp đồng

- **Outcome:** nhà, cây, đường trên bản đồ thế giới đẹp hơn rõ rệt (chi tiết, có khối, đường có mép tự nhiên),
  giữ đúng tông ánh sáng giờ vàng/hoàng hôn/trăng và vùng phát sáng cửa sổ.
- **Constraints:** ≤ 12 lượt, giữ lại ≥ 4 lượt dự phòng sinh lại; không đổi id level/entity, vị trí va chạm,
  portal; script sinh map vẫn tất định (ảnh PixelLab lưu vào repo + ghi `art-recipes.json`, `credits.json`);
  xem từng ảnh trước khi nhận (pixflux hay ra lỗi); khởi động lại Vite sau khi thêm asset.
- **Non-goals:** không vẽ lại hero, quái, nền trận, tường thành/tháp/cổng, nhà nguyện, đồ vật nhỏ (rào, giếng,
  thùng); không đổi bố cục level.
- **Acceptance:** atlas mới thay nhà/cây/đường cho cả 5 chương; ảnh chụp trước/sau Lexhold, Misty_Village,
  Misty_Fields; vùng sáng cửa sổ khớp vị trí mới; `npm run typecheck`, `npm test` pass; map sinh lại hai lần ra file giống nhau.

## Phương án

| | A. Sinh ảnh rồi cắt vào ô atlas (khuyên dùng) | B. Nhà/cây thành sprite object riêng | C. Không dùng PixelLab, chỉnh bằng code |
|---|---|---|---|
| Cách | pixflux nhà 96×96 → cắt 3×3 ô thay tên ô cũ; cây 32/64 px; đường bằng `create-tileset` + autotile Wang | đặt nhà/cây là entity sprite, va chạm riêng | thêm bóng, viền, biến thể màu cho ô Kenney |
| Lượt | ~6 | ~6 | 0 |
| Sửa code | ít: bảng ô + glow rect + autotile đường | nhiều: loader, collision, depth-sort, glow | vừa |
| Giả định chính | ảnh pixflux cắt lưới 32 px vẫn khớp, không lệch mép | runtime chịu thêm entity | Kenney 16 px đủ đẹp khi thêm hiệu ứng |
| Hỏng trước khi | nhà sinh ra không đúng khung 3×3 (mái tràn, lệch tâm) | vỡ thứ tự vẽ/va chạm ở 5 chương | người dùng vẫn thấy "xấu" vì nét gốc thô |

Chọn **A**: tận dụng cơ chế stamp sẵn có, đổi một chỗ ăn cả 5 chương, dễ bỏ (đổi lại bảng `KENNEY_TILES`).

## Phân bổ lượt (A)

| Bước | Lượt | Ghi chú |
|---|---|---|
| Pilot: 1 nhà mái cam 96×96 | 1 | Thử luôn 2 bản trên máy (miễn phí): giữ 96 px gốc, hoặc thu 48 px rồi ×2 cho cùng độ hạt Kenney. Chụp in-game, người dùng chốt. |
| Nhà đá mái xám | 1 | Cùng seed/prompt phong cách với pilot |
| Cây: sồi xanh, thông, cây thu | 3 | 64×64 (2×2 ô, va chạm chỉ ô gốc) hoặc 32×32 tuỳ pilot |
| Đường cỏ↔đất (tileset Wang) | 1? | Đọc balance trước/sau; nếu tốn > 2 lượt thì dừng, làm mép đường bằng code |
| Dự phòng sinh lại | 6 | |

## Rủi ro

- Độ hạt lẫn lộn: nhà/cây PixelLab chi tiết hơn rào, giếng Kenney ×2. Pilot quyết định bản 96 px hay 48→×2.
- Tileset thay luôn ô cỏ nền → lệch màu với ô cỏ Kenney còn lại; cần dùng tileset cho toàn bộ nền cỏ ngoài trời.
- Ảnh màu không trung tính sẽ bị lớp MULTIPLY của preset ánh sáng làm đục; prompt phải ghi rõ tông sáng trung tính.
- Hết lượt giữa chừng: atlas vẫn sinh được vì ô nào chưa có ảnh mới thì lùi về Kenney.

## Câu hỏi còn mở

1. Đồng ý dùng ~6/12 lượt, giữ ~6 dự phòng? Có định mua thêm lượt nếu pilot đẹp không?
2. Cây: giữ cỡ 1 ô hay cho cây to 2×2 ô (đẹp hơn nhưng che đường, cần soát lại bố cục)?
3. Có muốn gộp cả tường thành/tháp/nhà nguyện vào đợt này không (hiện để ngoài phạm vi)?
