# Brainstorm: chọn từ ra đề theo độ khó / mới / quen

Ngày 2026-11-25. Phản hồi người chơi: từ lặp nhiều, phần lớn là từ dễ; muốn phân biệt từ khó/dễ, mới/quen như LingoBrain.

## Hiện trạng (đã xác minh)

- `server/src/battle/battle-preparation.ts:54` `learnedCandidates`: chỉ dùng `lapses` (LingoBrain) + `word_misses` (HeroX) làm "độ yếu"; còn lại giữ thứ tự bộ từ. Không dùng `ef`, `due`, `state`, `reps`, `hist` dù payload LingoBrain có đủ (`server/src/learning/contract-eng-payload.test.ts:19`).
- `server/src/learning/learning-stats.ts:87` `readSrsRecord` chỉ đọc `state, ivl, ef, lapses, last, mt, hist`; `LearnedWordProgress` chỉ xuất `mastered` + `lapses`.
- `server/src/battle/battle-repository.ts:94`: `word_misses` chỉ cộng dồn, không bao giờ giảm → từ đã sai một lần là "yếu" mãi.
- `shared/src/combat/word-pool.ts:63`: 12 từ yếu nhất luôn vào bộ (thứ tự cố định → cùng 12 từ mọi trận), ra đề nặng gấp 3.
- `word-pool.ts:64-67`: kéo trọn từ của tối đa 6 chuỗi cụm vào bộ; `pickPromptWord` mở chuỗi 30% và bắt buộc nối tiếp chuỗi. 126 từ trong chuỗi (`shared/src/data/word-chains.ts`) toàn từ rất phổ biến (run, away, back, fire…) = từ dễ.
- `RECENT_PROMPT_MEMORY = 3`: chỉ tránh lặp 3 đề gần nhất; không có bộ nhớ giữa các trận.

### Mô phỏng (10 trận × 20 đề, combo luôn giữ được, 2000 từ đã học, 12 từ yếu)

| Chỉ số | Giá trị |
|---|---|
| Đề rơi vào 126 từ chuỗi cụm (6% vốn từ) | **74%** |
| Đề rơi vào 12 từ yếu cố định | 20% |
| Đề rơi vào ~1860 từ còn lại | ~6% |
| Từ khác nhau trong 200 đề | 89 |
| Từ ra nhiều nhất | 11 lần |

Kết luận: lặp + dễ chủ yếu do chuỗi cụm và danh sách từ yếu không bao giờ hết hạn, không phải do thiếu từ.

## Hợp đồng

- **Outcome:** mỗi trận trộn từ theo trạng thái nhớ của người chơi (mới, đến hạn ôn, khó, quen, đã thuộc), ít lặp trong trận và giữa các trận; từ dễ/đã thuộc chỉ thỉnh thoảng xuất hiện.
- **Constraints:** chỉ đọc (SELECT) dữ liệu LingoBrain, không ghi ngược; `prepareBattle` vẫn thuần + seed tất định; `pickPromptWord` chạy cả client lẫn replay server nên đổi logic phải khớp hai phía; bảng mới chỉ trong schema `herox` theo cơ chế migrate sẵn có (`server/src/db/migrate.ts`).
- **Non-goals:** không tự làm SRS riêng trong HeroX; không thêm cột độ khó (CEFR/tần suất) vào bộ từ LingoBrain; không đổi trận hướng dẫn; không đổi UI.
- **Acceptance criteria:** chạy lại mô phỏng trên: từ chuỗi cụm ≤ 25% đề; không từ nào ra > 3 lần trong 10 trận khi vốn từ ≥ 500; mỗi trận đúng tỉ lệ nhóm (±1 từ) khi đủ từ mỗi nhóm; từ sai trong HeroX hết "yếu" sau khi trả lời đúng liên tiếp N lần; test `word-pool`, `battle-preparation`, `battle-replay` pass.

## Phương án

| | A. Chỉnh tham số | **B. Phân nhóm theo SRS LingoBrain + nhớ giữa trận (đề xuất)** | C. SRS riêng của HeroX |
|---|---|---|---|
| Làm gì | Giảm tỉ lệ chuỗi, nới bộ nhớ đề gần, cho `misses` phân rã theo `last_miss_at` | Phân 5 nhóm từ dữ liệu SRS; hạn ngạch bộ từ theo loại trận; bảng `herox.word_exposures` ghi lần gặp/đúng liên tiếp; chuỗi chỉ dùng từ đã có trong bộ | HeroX tự chấm, tự tính hạn ôn từng từ |
| Giả định chính | Lặp chỉ do tham số | Dữ liệu SRS LingoBrain phản ánh đúng khó/dễ của người chơi | Người chơi chấp nhận hai lịch ôn khác nhau |
| Hỏng trước khi | Người chơi vẫn thấy toàn từ quen, không có từ mới | Người chơi học ít ở LingoBrain → nhóm mới/đến hạn rỗng (xử lý: dồn hạn ngạch sang nhóm kế) | Lịch HeroX mâu thuẫn LingoBrain, không ghi ngược được |
| Chi phí | Nhỏ | Vừa (shared + server + 1 bảng) | Lớn, trùng chức năng |

### Phân nhóm (B)

| Nhóm | Điều kiện (từ payload LingoBrain + HeroX) |
|---|---|
| Mới | `state` learning/relearn hoặc `reps ≤ 2` |
| Đến hạn | `state = review` và `due ≤ now` (ưu tiên quá hạn lâu nhất, như `buildQueue` của LingoBrain) |
| Khó | `ef < 2.0` hoặc `lapses ≥ 2` hoặc lượt chấm gần nhất 0/1, hoặc sai trong HeroX gần đây chưa gỡ |
| Quen | review, chưa đến hạn, `ivl` 3–20 |
| Đã thuộc (dễ) | `ivl ≥ 21`, không sai gần đây |

Hạn ngạch gợi ý bộ 40 từ — trận thường: Mới 30%, Đến hạn 25%, Khó 25%, Quen 15%, Thuộc 5%. Trùm: Khó 40%, Đến hạn 25%, Mới 15%, Quen 15%, Thuộc 5%. Trận cuối chương 5 giữ `masteredOnly`. Trong mỗi nhóm ưu tiên từ lâu chưa gặp trong HeroX.

**Trade-offs:** B giảm combo kết liễu (chuỗi chỉ ra khi đủ từ trong bộ) → cần tăng số chuỗi hoặc chấp nhận combo hiếm hơn; đổi `pickPromptWord` làm trận đang dở lúc deploy có thể lệch replay (trận ngắn, chấp nhận hoặc gắn phiên bản thuật toán vào setup).

**Better approaches:** none - hướng đề xuất là hướng người dùng yêu cầu ("như LingoBrain"), bằng chứng: LingoBrain đã có đủ `ef/due/state/reps/hist` mà HeroX chưa dùng.

## Quyết định (người dùng chốt 2026-11-25)

1. Tỉ lệ: **cân bằng** như bảng trên (trận thường Mới 30 / Đến hạn 25 / Khó 25 / Quen 15 / Thuộc 5; trùm nghiêng Khó 40%).
2. Chuỗi cụm: **chỉ dùng chuỗi có đủ từ trong bộ đã chọn**, không kéo từ chuỗi vào bộ, giảm tỉ lệ mở chuỗi; chấp nhận combo kết liễu hiếm hơn.
3. **Thêm bảng `herox.word_exposures`** (lần gặp, đúng liên tiếp, lần gặp cuối), migrate tự động theo `server/src/db/migrate.ts`.

Hướng chọn: B.

## Câu hỏi còn mở

- N lần đúng liên tiếp để gỡ "yếu" (đề xuất 2) và ngưỡng `ef`/`lapses` cho nhóm Khó: chốt khi lập plan, kiểm bằng dữ liệu thật nếu có.
- Trận đang dở lúc deploy: chấp nhận lệch replay hay gắn phiên bản thuật toán vào setup — chốt khi lập plan.
