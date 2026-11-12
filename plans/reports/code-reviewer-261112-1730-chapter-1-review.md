# Code review phase 07 (chương 1), mức high, 2026-11-12

Phạm vi: các thay đổi phase 07 chưa commit (truyện, story routes, khoá lò rèn, client truyện, render sprite, map, credits).
Trạng thái: **chưa sửa**. Người dùng hẹn sửa sau. Danh sách việc nằm ở mục "Việc còn lại" của `phase-07-chapter-1-content.md`.

## Lỗi đã sửa khi chơi thử (trước review)
| Lỗi | Sửa |
|---|---|
| Thân chắn NPC/rương lệch xuống 32 px: hero bị chặn trước khi chạm vùng nói chuyện, đi từ dưới lên không mở được thoại | `refreshBody()` sau `setOrigin(0.5, 1)` (`client/src/scenes/world-scene.ts`) |
| Bảng nhiệm vụ DOM vẫn hiện trong màn trận, đè lên thanh máu | `.quest-tracker[hidden] { display: none }` (`client/src/story/story.css`) |
| Thoại `chapel-door` và `smith` không yêu cầu mốc `village-arrival`: thử thách hoặc trận mở trước, rồi server từ chối ghi mốc | Thêm `requires` cho 5 đoạn thoại, thêm lời nhắc khi chưa đủ mốc; trận do thoại gọi phải qua `canStartBattle`; thêm test bất biến trong `shared/src/story/story-rules.test.ts` |

## Lỗi review tìm ra (chưa sửa)
| # | File | Vấn đề | Tình huống lỗi | Hướng sửa |
|---|---|---|---|---|
| 1 | `client/src/scenes/battle-scene.ts:435` | Mốc trận chỉ ghi khi gửi kết quả trận thành công | Server đã lưu thắng nhưng client mất phản hồi; gửi lại bị 409, mốc không được ghi, phải đánh lại (kể cả trận trùm) | Khi 409 hoặc ghi mốc lỗi vẫn thử ghi mốc, có nút thử lại riêng cho mốc |
| 2 | `client/src/scenes/boot-scene.ts:95` | Lỗi 409 khi tạo nhân vật hiện thành câu lỗi mãi | Server tạo xong nhưng client hết giờ chờ 15 s; bấm lại thì báo "đã được tạo" mãi | Khi 409 thì tải lại `/me` rồi vào `loadStory` |
| 3 | `server/src/routes/citadel-routes.ts:159` | Khoá lò rèn áp lên cả người chơi cũ | Người chơi đã nâng lò rèn, chưa có mốc truyện: không nâng được, panel ẩn hết đồ | Cần chốt: ghi sẵn mốc `smith-rescued` cho người có `forge_level > 0`, hoặc chỉ khoá khi `forge_level = 0` |
| 4 | `server/src/battle/battle-repository.ts:104` | Server không kiểm khoá trận truyện khi bắt đầu trận | Gọi API thẳng, thắng trận thợ rèn hoặc trùm trước khi đủ mốc; chiến thắng đó sau này vẫn dùng để ghi mốc được | Kiểm `encounterGateState` ở route bắt đầu trận |
| 5 | `shared/src/progression/citadel-rules.ts:221` | Khoá lò rèn chỉ chặn nâng cấp, không chặn trang bị; mã công trình là chuỗi tự do | Server cho trang bị khi lò rèn khoá; gõ sai mã công trình trong dữ liệu vẫn biên dịch | Map thao tác theo công trình; `buildingUnlocks` dùng kiểu `BuildingId` |
| 6 | `client/src/story/world-story.ts:106` | `openChest` gọi `refresh()` làm hiện bảng nhiệm vụ vô điều kiện | Mở rương mạng chậm rồi đi vào NPC: bảng nhiệm vụ hiện đè lên hộp thoại | Bỏ qua khi hộp thoại đang mở |
| 7 | `client/src/scenes/battle-scene.ts:63` | `BOSS_KINDS` viết cứng; hình Quỷ Bù Nhìn tải thành 2 texture | Thêm trùm mới phải sửa nhiều chỗ; tốn bộ nhớ GPU trên iPhone | Suy ra trùm từ `fireShield`; dùng chung một texture |
| 8 | `client/src/scenes/battle-scene.ts:465` | Đổi `JournalResult` ra câu báo lỗi viết lại ở 2 nơi; câu "phiên đăng nhập hết" lặp 3 nơi, chữ khác nhau | Sửa câu phải sửa nhiều file | Tách hàm và hằng dùng chung |

## Ngoài phạm vi phase 07 (thuộc phase 08, chuyển cho phiên đó)
- `client/public/sw.js:76`: dọn cache khi có bản mới xoá luôn map và sprite trang mới vừa tải, nên lần mở offline sau không tải được map.
- `client/public/sw.js:14`: đổi logic cache mà chưa tăng `SW_VERSION`.

## Đã xác minh
- Chơi thử tự động trên PC (Chrome headless, chế độ dev): đi hết 12/12 mốc, khiên lửa bật ở pha 2, đoạn kết tự mở, không có lỗi console.
- Sau khi sửa 3 lỗi trên: typecheck và eslint sạch, 553/553 test pass.

## Chưa kiểm tra
- 8 lỗi review chưa sửa, chưa viết test tái hiện.
- Chưa chạy với server thật và đăng nhập LingoBrain; chưa thử trên iPhone.

## Câu hỏi còn mở
- Mục 3: ghi sẵn mốc cứu thợ rèn cho người chơi cũ, hay chỉ khoá khi lò rèn chưa nâng?
