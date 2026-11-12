# Code review: Phase 04, word combat (uncommitted)

Ngày: 2026-11-12 · Phạm vi: shared/src/combat/*, progression/level-curve, data/word-chains, server battle routes/repo/preparation/migration 002, api-guard, app/server wiring, learning-stats.listLearnedWords.
Lưu ý: `battle-replay.ts` + test bị sửa đồng thời lúc review (13:54, thêm `stepRecorded`). Report dựa trên bản mới nhất.

## Đã xác minh
- `npm run typecheck` exit 0; `npm test` 29 file / 349 test pass; coverage `shared/src/combat` 98.3% dòng.
- `npm run lint` **FAIL**: `prototypes/style-preview/src/asset-catalog.js:15` `'fetch' is not defined` (ngoài scope nhưng trái với nhận định "lint pass").
- Tất định: `advanceTo` (battle-state.ts:208-219) xử lý các mốc theo đúng thứ tự thời gian, combo hết hạn thắng khi trùng mốc (`<=`), nên chia dt kiểu gì cũng ra cùng kết quả **với dt nguyên**. Map `misses` duyệt theo thứ tự chèn, RNG mulberry32 thuần số nguyên, không dùng Date/Math.random trong shared/combat.
- Race cùng khung hình (đề hết giờ + input trong cùng frame → đề mới hiện < 150 ms → `too-fast`) đã được xử lý bằng `stepRecorded` (battle-replay.ts:60-69): input bị bỏ, không vào log. Test 40 seed theo frame 16 ms pass. `input-after-end` cũng bị lọc như vậy.
- Chống gian lận: battle scoped theo `user_id` (battle-repository.ts findBattle), double claim bị chặn bằng PK `battle_rewards` + `ON CONFLICT DO NOTHING RETURNING` trong transaction (pool.ts:97 có ROLLBACK), ring option phải nằm trên vòng từ, text ≤ 64, ≥150 ms, log ≤ 1000, endedAtMs ≤ wall clock + 2 s. Upsert `word_misses` qua `unnest` đúng (key Map duy nhất, không trùng dòng trong một lệnh).
- Logging: chỉ log mã vi phạm + entryIndex; không log text/token. Body limit 16 KB chung, 96 KB riêng route result; IP limiter ở onRequest chạy trước parse body.
- Luật: exact 1 / near 0.8 / ring 0.7, mastered ×1.25, same-POS 3 → ×1.3, chain → ×1.6 + execute ≤25%, combo đứt đúng tại 4 s, elite HP×2 vàng×2, tutorial khi learned < 8: khớp spec.

## Findings

### High

**H1. Không giới hạn số trận song song/thông lượng: kiểm wall-clock bị vô hiệu, farm vàng tuyến tính** - server/src/routes/battle-routes.ts:100-125, 136-141; battle-repository.ts:60
- `POST /battles` chỉ xoá trận *quá hạn 2 h*; trận chưa chốt khác vẫn sống. Kiểm `endedAtMs <= now - startedAt + 2s` tính riêng từng trận.
- Kịch bản: bot gọi `POST /battles` 25 lần trong 1 phút (rate limit 60/user/phút dùng chung), giữ 25 setup, tự giải mỗi trận bằng `step` (setup chứa sẵn đáp án) với input cách nhau đúng 150 ms, rồi nộp 25 kết quả sau khoảng 1 phút → 25× vàng trong thời gian thật của một trận. Kể cả tuần tự, trận field (khoảng 14 chiêu × 150 ms ≈ 2 s) cho bot khoảng 30 trận/phút so với khoảng 2 trận/phút của người thật.
- Fix: (a) một trận mở cho mỗi user: `createBattle` xoá mọi trận chưa chốt của user (`DELETE ... WHERE user_id=$1 AND NOT EXISTS (SELECT 1 FROM battle_rewards ...)`) hoặc partial unique index; trận cũ bị thay coi là `fled`. (b) cân nhắc chặn thời gian: tổng thời lượng các trận đã chốt không vượt thời gian thật (lưu `settled_ended_at` và bắt `startedAt` trận mới ≥ lần chốt trước), và/hoặc trần vàng/ngày. Cần quyết định nghiệp vụ (xem câu hỏi).

**H2. `step` nhận dt số thực nhưng server bắt `atMs`/`endedAtMs` phải là số nguyên an toàn: client Phaser sẽ bị 400 mọi trận** - battle-routes.ts:48-50, 65, 75; battle-state.ts:428-431; battle-replay.ts:60-67
- Phaser `update(time, delta)` trả `delta` số thực (vd 16.6667). Client gọi `stepRecorded(state, input, delta)` → `elapsedMs` số thực → `logEntry.atMs` số thực → `isTime` (`Number.isSafeInteger`) trả false → 400 "Kết quả trận sai định dạng", mất toàn bộ vàng.
- Nới server cho phép số thực cũng không an toàn: replay tính `state.elapsedMs + (atMs - state.elapsedMs)` (battle-replay.ts:85 → battle-state.ts:431), với số thực `a + (b - a) !== b` có thể lệch 1 ulp. Lệch này có thể lật phép so `deadline <= target` hay `elapsed - shownAt < 150` → replay khác client → 422 sai.
- Test chỉ dùng `FRAME_MS = 16` (số nguyên) nên không phát hiện. JSDoc của `step` và `stepRecorded` không nói dt phải nguyên.
- Fix: lượng tử hoá trong shared, ví dụ `step` dùng `Math.floor(dtMs)` và client giữ phần lẻ tích luỹ, hoặc `stepRecorded` nhận thời điểm tuyệt đối đã làm tròn. Thêm test frame `1000/60`. Có thể đổi `advanceTo` của replay sang mốc tuyệt đối (`advanceTo(entry.atMs)`) để bỏ phép cộng trừ.

### Medium

**M1. Trận hướng dẫn trả vàng với từ chưa học, farm được mà không cần học** - battle-preparation.ts:364-367; battle-routes.ts:156
- User có < 8 từ đã học luôn vào tutorial (8 từ cố định, thường là từ *chưa học*), thắng nhận 10 vàng mỗi trận, không giới hạn. Trái tinh thần "Không dùng từ chưa học / học là mạnh"; spec không nói tutorial có thưởng.
- Thêm nữa, từ sai trong tutorial ghi vào `word_misses` (battle-repository.ts upsert). Khi người chơi học từ đó sau này, từ đã bị coi là "yếu" ngay từ đầu (preparation:340-341).
- Fix: `goldEarned = outcome==='victory' && !tutorial ? ... : 0` (lưu cờ tutorial trong battles/setup), bỏ ghi misses cho tutorial. Cần xác nhận nghiệp vụ.

**M2. Cờ "từ yếu" không bao giờ giảm; client có thể bơm misses để tăng tỉ lệ quái tinh anh (×2 vàng)** - battle-preparation.ts:340-341; battle-repository.ts upsert `misses + EXCLUDED.misses`; battle-state.ts:232-235
- `weak = lapses + word_misses > 0`: chỉ cần sai 1 lần là yếu vĩnh viễn, vì trả lời đúng không trừ `word_misses`. Dần dần gần như mọi từ đều yếu: trọng số ×3 mất ý nghĩa, top-12 weak luôn đầy, elite 25% mỗi quái.
- Lạm dụng: nộp log `fled` toàn input sai (hợp lệ: không cần ≥150 ms giữa các lần sai trên đề khác nhau, chỉ cần ≥150 ms sau khi đề hiện) để mọi từ thành weak → mọi trận sau đều có thể có elite, vàng/trận tăng lên tới ×2.
- Fix: giảm `misses` khi trả lời đúng (ghi thêm `hits` từ state), hoặc tính weak theo ngưỡng/khoảng thời gian (`last_miss_at` trong N ngày). Cần quyết định nghiệp vụ.

### Low

**L1. Quái tinh anh mở màn bỏ qua `recentWordIds`: đề lặp liền nhau** - battle-state.ts:235, 263-266
- `eliteWord` lấy ngẫu nhiên từ toàn bộ từ yếu. Nếu nó trùng từ vừa hạ quái trước thì cùng đề ra hai lần liên tiếp. Fix: lọc `weakWords` theo `recentWordIds` trước khi `pick` (vẫn tất định).

**L2. Trận đang chơi qua lượt deploy bị 422** - battle-repository.ts (setup jsonb), shared/data/word-chains.ts
- Setup lưu dữ liệu nhưng không lưu phiên bản luật. Đổi `WORD_CHAINS`/hệ số/thuật toán chọn đề giữa lúc bắt đầu và lúc nộp thì replay lệch → `battleRejected`, người chơi mất thưởng mà không rõ lý do. Fix: thêm `rulesVersion` vào setup; server lệch version thì trả lỗi riêng (hoặc chốt `fled` không thưởng) thay vì 422 chung.

**L3. Dọn dữ liệu và thứ tự kiểm** - battle-repository.ts:60; battle-routes.ts:143-163
- Trận chỉ bị dọn khi *chính user đó* bắt đầu trận mới. User bỏ game để lại các dòng `battles` (setup tới 40 từ) mãi mãi. Fix: dọn định kỳ chung với job deleted-user cleanup.
- Replay chạy trước khi biết trận đã chốt. Nộp lại nhiều lần tốn CPU replay rồi mới 409. Rẻ, nhưng có thể kiểm `battle_rewards` trước.

**L4. `npm run lint` đang fail** - prototypes/style-preview/src/asset-catalog.js:15 (`fetch` no-undef). Hoặc thêm globals browser cho `prototypes/`, hoặc ignore thư mục prototype.

## Edge cases scout
- Trùng mốc combo + đề: combo đứt trước rồi mới timeout. Đúng spec "tới đúng 4 s là đứt".
- Cast đúng tại `deadlineMs`: timeout thắng (`<=`), input rơi vào đề mới, `stepRecorded` bỏ input. Người chơi vừa bị phạt timeout vừa mất câu trả lời. Chấp nhận được nhưng cần UI báo rõ.
- Chuỗi kết liễu xoá `links`, nên 2 chiêu ngay sau đó không thể có same-POS ×1.3. Đây là hệ quả thiết kế, ghi nhận.
- Bộ từ có thể có 2 id cùng chữ (vd "light" n/adj): vòng từ có thể hiện 2 ô giống hệt, chạm nhầm id bị chấm sai. Chưa kiểm được dữ liệu deck.

## Chưa kiểm tra / giả định
- Hành vi cũ của `/me` trước khi tách api-guard: `me-routes.ts` là file untracked, không có bản git để diff. Chỉ xác nhận hạn mức hiện dùng chung 120/IP, 60/user/phút cho `/me` + battle (spec phase-04 dòng 51 đã ghi điều này).
- Client battle scene (phase 05) chưa có, nên H2 là rủi ro tích hợp, chưa phải lỗi đã chạy.
- Không chạy test với Postgres thật cho `settleBattle` (chỉ đọc SQL).

## Câu hỏi mở
1. Thông lượng vàng: chỉ cho một trận mở/user? Có trần vàng/ngày không?
2. Trận hướng dẫn có được nhận vàng không? Có ghi `word_misses` cho từ chưa học không?
3. "Từ yếu" có cần giảm/hết hạn khi trả lời đúng không (theo `last_miss_at`)?
4. Deck LingoBrain có từ trùng chữ khác id không?

Findings: critical=0 high=2 medium=2 low=4 new=8
Status: DONE_WITH_CONCERNS
