# Thiết kế demo UI Gothic tối giản cho HeroX

## Mục tiêu

Dựng một demo HTML cục bộ để duyệt lại phong cách của đúng bốn thành phần giao diện:

1. Khung yêu cầu đăng nhập LingoBrain.
2. Khung chọn và mặc ngoại trang.
3. Thanh máu nhân vật.
4. Bảng thông tin nhân vật.

Demo không thay đổi code game, không kết nối API và không mở rộng sang nền, bản đồ, nhân vật hoặc các màn khác.

## Phong cách hình ảnh

Sử dụng hướng Gothic tối giản, bám theo `docs/art-direction.md`:

- Nền mực đêm `#0b0a10` và panel tro `#1b1720`.
- Điểm nhấn máu thánh `#7a141c` và vàng nến `#e8c66a`.
- Chữ màu xương `#d9d2c0`.
- Viền mảnh, góc khung vuông hơi hướng pixel; tránh họa tiết Gothic quá dày.
- Tiêu đề dùng serif hỗ trợ tốt tiếng Việt; nội dung dùng sans-serif rõ nét.
- Độ tương phản đủ cao để đọc trên cả desktop và điện thoại ngang.

## Bố cục thành phần

### Đăng nhập

Khung đá đen nằm giữa vùng xem, huy hiệu HeroX ở phía trên, một đoạn mô tả ngắn và nút đỏ máu “Đăng nhập LingoBrain”. Nút có viền vàng nến và trạng thái hover/nhấn để minh họa.

### Mặc đồ

Khung hai cột. Cột trái là vùng xem nhân vật mang tính minh họa; cột phải là danh sách ngoại trang. Mỗi ngoại trang thể hiện rõ một trong ba trạng thái: “Đang mặc”, nút “Mặc”, hoặc “Chưa mở”. Trên màn hình hẹp, hai cột xếp dọc.

### Thanh máu

HUD gọn ở góc trên trái gồm chân dung nhỏ, tên nhân vật, cấp độ, thanh máu đỏ sẫm và chỉ số HP hiện tại/tối đa. Thanh máu vẫn rõ khi đặt trên nền tối hoặc nền game nhiều chi tiết.

### Thông tin nhân vật

Bảng cùng hệ khung với HUD, hiển thị tên, cấp, sức mạnh, phòng thủ và tiến độ học từ. Thông tin được chia nhóm bằng đường kẻ mảnh thay vì thêm nhiều hộp lồng nhau.

## Hành vi demo

- Một file HTML cục bộ tự chứa CSS và JavaScript cần thiết.
- Bốn tab chuyển giữa: Đăng nhập, Mặc đồ, Thanh máu, Nhân vật.
- Công tắc Desktop/Mobile đổi kích thước vùng xem để đánh giá responsive.
- Nút “Đăng nhập” và “Mặc” chỉ có phản hồi thị giác; không điều hướng và không lưu trạng thái thật.
- Dữ liệu nhân vật là dữ liệu mẫu, được ghi rõ là nội dung demo.
- Không gọi mạng, không gọi API và không phụ thuộc server game.

## Responsive

- Chế độ Desktop mô phỏng tỷ lệ 16:9.
- Chế độ Mobile mô phỏng điện thoại nằm ngang.
- Nội dung không tràn khung, nút có vùng chạm phù hợp và chữ tiếng Việt không bị cắt.
- Khung mặc đồ chuyển từ hai cột sang bố cục dọc khi không đủ chiều rộng.

## Tiêu chí duyệt demo

- Bốn thành phần có chung một ngôn ngữ thiết kế Gothic tối giản.
- Màu sắc khớp art direction hiện tại của HeroX.
- Thứ bậc thông tin rõ ràng ở cả hai chế độ Desktop và Mobile.
- Thanh máu và dữ liệu nhân vật đọc được ngay, không bị trang trí lấn át.
- Demo không tác động đến code hoặc dữ liệu game chính.

## Bước sau khi duyệt

Chỉ sau khi người dùng duyệt demo, thiết kế mới được chuyển thành kế hoạch tích hợp vào các thành phần thật trong `client/`. Việc tích hợp không thuộc phạm vi của demo này.
