# Brainstorm: chuyển chương 1 → 2 (và các chương sau)

## Bằng chứng
- Game luôn nạp chương 1: `setActiveChapter`/`chapterForWordCounts` (`client/src/maps/chapter-maps.ts:52,65`) không có nơi gọi ngoài test.
- Cổng tới level ở project khác bị bỏ qua: `client/src/scenes/world-scene.ts:696`.
- Khoá cổng đã đúng: `levelGateState` (`shared/src/story/story-rules.ts:170`) + `levelGates` mỗi chương (vd `chapter-1.ts:123` Ash_Forest cần epilogue + 100 từ).
- Ash_Forest không có cổng về Lexhold.

## Contract
- **Outcome:** xong truyện chương N và đủ từ → đi qua cổng sang map chương N+1; mở lại game vào đúng chương đang chơi; từ chương 2–5 về được Lexhold và quay lại.
- **Constraints:** mỗi chương giữ project LDtk riêng; không đổi id level/spawn/entity hiện có; không đổi quy tắc khoá cổng, tiến độ lưu.
- **Non-goals:** gộp map, đổi mốc từ, UI chọn chương, sửa nội dung truyện.
- **Acceptance:** test đơn vị cho hàm tìm chương chứa level và chương khởi động theo tiến độ; e2e/thủ công: Lexhold cổng đông → Ash_Forest (khi đủ điều kiện), Ash_Forest → Lexhold, mở lại game vào chương đang chơi; typecheck/lint/test pass.

## Phương án
1. **Cổng xuyên chương (đề xuất).** Cổng trỏ level không có trong project hiện tại → tra chương chứa level, `setActiveChapter`, restart Boot với `{levelId, spawnId}` đích. Lúc vào game chọn chương cao nhất đã bắt đầu theo truyện và đủ từ.
   Giả định chính: Boot restart được giữa phiên mà không phải đăng nhập lại/ mất trạng thái. Hỏng đầu tiên khi: boot gắn chặt luồng xác thực, phải tách bước nạp map.
2. **Gộp mọi chương vào một project LDtk.** Không cần chuyển project. Giả định: kích thước file/atlas chấp nhận được. Hỏng khi: phá quyết định "mỗi chương một project" và test chương 1; chi phí di chuyển lớn.
3. **Chỉ nạp theo tiến độ lúc vào game.** Rẻ nhất. Hỏng ngay: người chơi phải tải lại trang mới sang chương mới.

## Trade-offs
- (1) thêm một đường tải map giữa phiên (màn chờ ngắn); (2) nặng, đảo kiến trúc; (3) trải nghiệm hỏng.

Better approaches: none - recommended direction is the requested one (khoá cổng và mốc từ đã có; chỉ thiếu bước đổi project).

## Quyết định người dùng (2026-11-26)
- Vào game: nạp chương đang chơi, spawn đầu chương (vd Ash_Forest/from-lexhold).
- Thêm cổng Ash_Forest → Lexhold (spawn phía đông); chương 3–5 về Lexhold xét trong plan (cổng về chương trước hoặc thẳng Lexhold).

## Câu hỏi còn mở
- Chương 3–5 về Lexhold: cổng về chương trước (đi lùi từng chương) hay cổng thẳng Lexhold? Đề xuất: mỗi map đầu chương có cổng về level cuối chương trước, giữ một chiều địa lý.
- Lexhold đã có spawn nhận người từ Ash_Forest chưa (cần kiểm `from-east`/tương đương).
