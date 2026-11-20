# Định hướng hình ảnh HeroX

Nguồn chuẩn cho mọi asset nhân vật, quái, map, UI. Chốt với người dùng ngày 2026-11-12.

## Đích hình ảnh

Ảnh mẫu: `prototypes/style-preview/public/assets/reference/style-target.png` (người dùng cung cấp, chỉ dùng tham khảo nội bộ, không phát hành).

- Dark fantasy gothic, top-down 3/4, pixel art chi tiết, tỉ lệ người thật (không chibi).
- Không khí: tu viện đổ nát, đêm mưa, nghĩa địa, cổng sắt, nến và lò lửa vàng ấm, vòng huyết đỏ phát sáng.
- Thập tự quân áo trắng thập tự đỏ, khiên lớn; quái: ghoul, chó địa ngục, giáo sĩ áo choàng đỏ, xương kỵ sĩ; trùm giám mục sa ngã cầm lư hương.
- Hiệu ứng: vệt chém vàng, vòng thánh vàng, vòng huyết đỏ (đã có bản tương đương trong pixelfx).

## Thông số kỹ thuật (giữ nguyên quyết định cũ)

| Mục | Giá trị |
|---|---|
| Góc nhìn | top-down 3/4 (không isometric, LDtk không hỗ trợ) |
| Độ phân giải logic | 640x360, phóng nguyên khối, `pixelArt: true` |
| Lưới tile | 32px |
| Nhân vật, quái thường | khung 64x64, thân cao khoảng 48–56px, 4 hướng (8 hướng nếu PixelLab cho rẻ) |
| Quái tinh anh | khung 64–96px |
| Trùm | khung 128x128 |
| Chân dung hội thoại | 64x64 hoặc 96x96 |
| Atlas | mỗi tấm ≤ 2048x2048 (WebGL iPhone) |

## Bảng màu

| Tên | Hex | Dùng cho |
|---|---|---|
| Mực đêm | `#0b0a10` | nền, bóng tối |
| Tro | `#1b1720` | panel UI |
| Xương | `#d9d2c0` | chữ thường |
| Máu thánh | `#7a141c` | áo choàng, thập tự, viền nguy hiểm |
| Than hồng | `#e0602a` | lửa, động từ |
| Vàng nến | `#e8c66a` | tiêu đề, viền chọn, tính từ |
| Thánh quang | `#fff1c2` | phép thánh |
| Vực câm | `#5a2a6a` | quỷ, phép tối, trạng từ |

Danh từ dùng `#6aa8e8`. Màu từ loại phải giống nhau ở mọi màn (nhãn trên quái, vòng từ, bảng chiêu).

## Nguồn asset

1. **Bản chính: PixelLab** (https://pixellab.ai, MCP `https://api.pixellab.ai/mcp`).
   - Tạo nhân vật, quái, trùm, chân dung, có thể cả tileset top-down.
   - Mọi lần tạo đều dùng ảnh mẫu ở trên làm chuẩn phong cách và khoá bảng màu.
   - Theo `llms.txt` của PixelLab, gói nào cũng được dùng thương mại; kiểm lại điều khoản trước khi phát hành.
   - Người dùng tự đăng ký và tự thêm MCP. Token không đưa vào repo, chat hay log.
2. **Bản tạm khi chưa có PixelLab:** LPC, DCSS (CC0), pixelfx (MIT).
   - Công thức ghép hero tạm nằm ở `prototypes/style-preview/tools/build_style_assets.py`: kiểu "Crusader" của Sorthen, gồm mũ bascinet + mặt nạ pigface, giáp tấm, giáp vai, khiên thập tự lớn, áo choàng đỏ, kiếm dài.
   - Chỉ dùng layer LPC có ít nhất một license không phải GPL.
3. Mỗi asset phải có dòng credit (nguồn, license, công cụ, ngày tạo). Asset PixelLab cần lưu thêm prompt, seed, ảnh tham chiếu để tạo lại được.

## Hero

- **Hiệp sĩ Thánh Ngôn:** giáp tấm bạc, mũ kín có mặt nạ, áo khoác trắng thập tự đỏ, **khiên thập tự lớn** (người dùng yêu cầu giữ), áo choàng đỏ, kiếm dài.
- Phải đọc ra "bá khí": dáng cao, vai rộng. Tránh đầu to, mũ tròn, tỉ lệ chibi. Người dùng đã chê bản LPC armet là "trông hài".
- Hoạt ảnh tối thiểu: đứng, đi, chém, niệm phép, trúng đòn, chết.
- Ngoại trang (Xưởng may, phase 06) là biến thể của cùng hero: đổi áo choàng, hoạ tiết khiên, mũ, màu giáp. Giữ nguyên dáng và khung để hoạt ảnh khớp.

## Trình bày trong game

- **Bóng tối:** một lớp tối toàn màn hình, khoét vùng sáng quanh hero và nguồn lửa, thêm quầng sáng cộng màu ở nguồn lửa.
  - Mưa phủ màn hình, tàn lửa bay trên dung nham.
  - Nền ghép sẵn thành một texture và phủ màu chung để tile khác nguồn về cùng một tông.
- **Chữ HUD và hội thoại:** chữ tiếng Việt cần sắc nét.
  - Tiêu đề dùng `Cambria, 'Times New Roman', serif`. Georgia thiếu glyph ố, ề, ầ nên vỡ dấu.
  - Thân chữ dùng font sans của hệ thống.
- **Trận:** sân nhìn dọc (6×11 ô) dựng từ tile atlas chương 1, phóng ×2, theo chủ đề trận (`battle-arena-layout.ts`).
  - Cánh đồng cho trận dã ngoại, làng cho lò rèn, hang có tàn lửa cho trùm; có lớp tối và quầng sáng theo nhân vật.
  - Hero đứng dưới nhìn lên (sheet LPC hàng hướng lên: đứng, chém, niệm, gục), quái đứng trên (sprite 64 px ×2, trùm 128 px ×1.5).
  - Đòn trúng có lao tới, giật lùi, loé trắng; đòn kết khựng hình 80 ms. Hiệu ứng chiêu xoay theo trục dọc (lên/xuống).
  - Sân căn giữa khung 360×780 (lưới 384 px cắt đều 12 px hai mép); hero, quái cùng tâm ngang với thẻ đề.
  - HUD là DOM/CSS phủ trên canvas (`battle-hud.ts`, `battle-hud.css`): hàng trên là thẻ máu hiệp sĩ và quái,
    dưới đó một thẻ đề chung chiếm trọn chiều ngang (emoji, nghĩa tiếng Việt, thanh thời gian, combo).
  - Dock dưới: hàng nút phụ, rồi ô gõ hoặc vòng từ 2 cột × 3 hàng chiếm trọn chiều ngang; từ dài xuống dòng, không cắt.
  - Khung dọc (portrait-only): dock dưới né bàn phím ảo iOS qua `--keyboard-inset`.

## Bản xem tham chiếu

Chạy bản xem: `npx vite prototypes/style-preview --port 5190`.

Bản xem gồm 3 tab:
- **Thiết kế:** bảng thiết kế.
- **Màn 1:** khám phá làng.
- **Màn 2:** trận đánh.

Đây là bản xem phong cách viết bằng JS thuần. Code game chính nằm ở `client/` và không import từ bản xem này.
