# Dựng lại sân trận và giao diện trận bằng DOM

Trạng thái: xong code, chờ người dùng xem trên máy (2026-11-20). Nguồn: tư vấn `/g1:ask` cùng ngày, người dùng chọn làm phần A và B.

## Mục tiêu
Màn trận hết "trông như bản debug": có sân, ánh sáng, hoạt ảnh, đòn có lực; HUD sắc nét theo bảng màu gothic.

## Ràng buộc
- Không đổi logic trận (`shared/src/combat`), API, setup, log gửi server.
- Giữ quyết định đã chốt: một đề chung giữa màn (không thẻ đề riêng từng quái).
- Không có asset mới; chỉ dùng tile atlas chương 1, sheet LPC hero có sẵn, sprite quái có sẵn, pixelfx.
- Hoạt ảnh không khoá input lâu hơn luật chống bấm vội hiện có.

## Không làm
- PixelLab, thay sprite; đổi luật trận; thẻ đề trên đầu từng quái.

## Phần A: sân trận (Phaser)
- Generator chương 1 ghi thêm `assets/tilesets/chapter-1-tiles.json` (tên tile → chỉ số atlas).
- `client/src/battle/battle-arena-layout.ts` (thuần, có test): trận → chủ đề (cánh đồng, làng, hang trùm), lưới tile, điểm sáng.
- `client/src/render/battle-arena.ts`: vẽ lưới tile phóng ×2, `DarkAtmosphere`, tàn lửa ở hang trùm.
- Hero dùng sheet idle/slash/spellcast/hurt; quái phóng số nguyên, nhún, bóng, nháy trắng, bị đẩy lùi, lao vào khi đánh.
- `battle-cues.ts` thêm cue `actor` (hero chém / niệm / trúng đòn; quái trúng đòn / lao vào).

## Phần B: HUD DOM
- `client/src/ui/battle-hud.ts` viết lại bằng DOM: thẻ hero, thẻ quái, thẻ đề + đồng hồ, combo, chữ nổi, màn kết quả, nút.
- Vòng từ và ô gõ thành phần tử DOM trong dải dưới; iPhone dọc: dải dưới nằm ở phần đen dưới canvas.
- Ẩn bảng nhiệm vụ trong suốt trận.
- E2E driver bấm nút DOM thay vì toạ độ canvas.

## Nghiệm thu
- `npm run typecheck`, `npm run lint`, `npm test` pass.
- E2E `battle.spec.ts` pass trên desktop-chrome và iphone-12; ảnh chụp đính kèm cho thấy sân trận và HUD mới.
