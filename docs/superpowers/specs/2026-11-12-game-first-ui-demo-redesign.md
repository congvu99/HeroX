# Thiết kế lại demo UI HeroX theo tư duy game

## Vấn đề của bản đầu

Bản demo đầu dùng header, tab và card theo cách của một dashboard web. Dù bảng màu đúng, bố cục không hòa vào cảnh chơi, không dựa trên độ phân giải logic 640×360 và không tạo cảm giác đang thao tác trong một action RPG pixel-art.

## Quyết định thiết kế

Chọn hướng **Action RPG dark-fantasy**. Demo mới mô phỏng trực tiếp khung game 640×360 và coi mỗi UI là một trạng thái của game, không phải một trang web:

- Đăng nhập là title screen.
- Thanh máu là HUD phủ lên cảnh chơi.
- Mặc đồ là màn armory/inventory.
- Thông tin nhân vật là character sheet.

Chỉ bốn phần trên được thiết kế lại. Dữ liệu vẫn là dữ liệu mẫu và không kết nối API.

## Ngôn ngữ hình ảnh

- Khung vuông, cạnh cắt góc, đường viền kim loại/xương; không dùng bo tròn hoặc card nổi kiểu web.
- Bố cục theo pixel grid 4 px và hiển thị ở 640×360, phóng nguyên khối khi có thể.
- Màu mực đêm, tro, máu thánh, vàng nến và xương từ art direction hiện tại.
- Chữ tiêu đề serif Gothic; nhãn và chỉ số nhỏ, gọn như HUD game.
- Dùng vignette, khói, ánh nến và texture đá bằng CSS để đặt UI vào không gian dark-fantasy.
- Dùng sprite hero hiện có làm tâm điểm cho màn mặc đồ; không dùng silhouette vector chung chung.

## Bốn trạng thái UI

### Title screen / đăng nhập

Logo HeroX nằm trong phần trên của cảnh tu viện tối. Nút “Đăng nhập LingoBrain” là một command button ở gần đáy màn hình, có con trỏ hình thoi và phản hồi nhấn. Thông tin liên kết tiến độ học từ nằm thành một dòng phụ, không nằm trong card.

### HUD / thanh máu

HUD đặt trực tiếp ở góc trên trái của cảnh chơi. Chân dung nằm trong huy hiệu khiên, tên và cấp nằm trên thanh máu, HP hiển thị ngay trong thanh. Bên dưới có một thanh khiên nhỏ. HUD không có nền panel chữ nhật lớn; chỉ có các mảng kim loại cần thiết để đọc trên cảnh.

### Armory / mặc đồ

Hero sprite đứng giữa trên bệ tròn. Các ô mũ, áo choàng, khiên và vũ khí nằm quanh nhân vật như equipment slots. Một dải ba ngoại trang ở đáy cho biết “Đang mặc”, “Có thể mặc” và “Khóa”. Nút hành động dùng command bar của game thay vì nút HTML thông thường.

### Character sheet / thông tin nhân vật

Chân dung/hero ở bên trái; bên phải là tên, cấp và bốn chỉ số có icon. Tiến độ học từ nằm ở cuối như một thanh tiến trình rune. Các đường phân cách và tiêu đề dùng cùng chất liệu kim loại với HUD.

## Điều khiển demo

- Demo vẫn là một HTML cục bộ, mở trực tiếp và không gọi mạng.
- Một command strip nhỏ nằm ngoài khung game để chuyển giữa bốn trạng thái và Desktop/Mobile; nó được ghi rõ là công cụ duyệt, không phải UI trong game.
- Có thể dùng phím `1`–`4` để chuyển trạng thái và phím `M` để đổi chế độ xem.
- Chế độ Desktop và Mobile đều giữ tỷ lệ 16:9; Mobile thu nhỏ theo điện thoại ngang chứ không biến thành trang dọc.

## Tiêu chí đạt

- Khi bỏ command strip duyệt ra, ảnh chụp khung 640×360 phải trông như một màn game hoàn chỉnh.
- Không còn header trang web, tab card, danh sách form hoặc bố cục dashboard bên trong khung game.
- Mỗi UI thể hiện đúng vai trò trong game và vẫn đọc được ở kích thước mobile ngang.
- Màn mặc đồ dùng sprite hero thật của dự án.
- Bốn trạng thái dùng chung một bộ viền, icon, typography và nhịp pixel.
- Không sửa code game chính trước khi người dùng duyệt demo mới.
