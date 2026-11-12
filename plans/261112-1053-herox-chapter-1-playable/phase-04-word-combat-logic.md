---
phase: 4
title: "Hệ chiến đấu bằng từ (logic thuần)"
status: completed
priority: P1
effort: "3d"
dependencies: [2]
---

# Phase 04: Chiến đấu bằng từ

## Goal
Máy trạng thái trận thuần TypeScript trong `shared/`, test kỹ, không phụ thuộc Phaser; server dùng cùng code để kiểm kết quả trận khi phát thưởng.

## Luật (bản đầu, cân lại khi playtest)
- Quái hiện đề: emoji + nghĩa tiếng Việt của một từ người chơi **đã học**.
- **Gõ từ:** khớp sau chuẩn hoá (thường, bỏ dấu câu); từ ≥ 5 chữ cho lệch 1 ký tự (giống `eng/js/srs-scheduler.js` `normAnswer` + Levenshtein, viết lại trong HeroX). Sát thương 100%; gần đúng 80%.
- **Vòng từ:** 6 ô = 4 từ trong `skill_loadout` + đáp án đúng (nếu chưa có) + từ nhiễu cùng loại từ. Sát thương 70% vì là nhận diện.
- **Loại chiêu theo từ loại:** động từ → tấn công; danh từ → triệu hồi/khiên; tính từ → buff/debuff; trạng từ, giới từ → di chuyển (phase 05).
- **Combo / ghép chuỗi:** tung đúng liên tiếp trong cửa sổ 4 giây. Chuỗi 3 từ cùng loại → ×1.3; chuỗi theo cụm hợp lệ (bảng `shared/data/word-chains.ts`, biên tập tay, ví dụ `run → away → quickly`) → ×1.6 và chiêu kết liễu. Sai một từ → đứt chuỗi.
- **Sai từ:** quái đánh trả, ghi `word_misses` (gửi cuối trận). Từ hay sai (theo `lapses` của `eng` hoặc `word_misses`) thỉnh thoảng thành **quái tinh anh**: nhiều máu hơn, thưởng gấp đôi.
- **Bậc chiêu:** từ đã thuộc (`ivl ≥ 21`) mạnh hơn 25%.
- Không dùng từ chưa học. Người chơi có < 8 từ đã học → trận hướng dẫn dùng 8 từ cố định của chương 1 và nhắc học ở LingoBrain.

## Files to Create
- `shared/src/combat/battle-state.ts` — trạng thái, sự kiện (`prompt`, `cast`, `hit`, `miss`, `comboUp`, `comboBreak`, `enemyAttack`, `victory`, `defeat`), hàm `step(state, input, dtMs)` thuần, có seed RNG để tái lập.
- `shared/src/combat/answer-matching.ts`, `damage-formula.ts`, `word-pool.ts` (chọn đề, tránh lặp, trộn từ yếu), `combo-chain.ts`, `ring-options.ts`.
- `shared/src/progression/level-curve.ts` — cấp anh hùng theo `learned`; bảng mốc mở vùng 0/100/300/600/1000 (+200 đã thuộc cho chương 5).
- `shared/data/word-chains.ts` — 30 chuỗi cho chương 1 từ từ phổ biến.
- `server/src/routes/battle-routes.ts` — `POST /herox/api/battles/:battleId/result` nhận log input tối giản (từ đã tung, thời gian), server chạy lại `battle-state` với seed đã cấp lúc `POST /herox/api/battles` để kiểm thắng/thua, ghi thưởng + `word_misses` trong 1 transaction; `battle_rewards` chặn nhận 2 lần.
- `shared/test/*.test.ts` — bảng test cho từng luật trên.

## Verification
- `npm test -w shared -w server` pass, phủ ≥ 90% dòng cho `shared/src/combat`.
- Test chạy lại cùng seed + cùng log input → cùng kết quả (tất định).
- Gửi log giả mạo (từ chưa học, tốc độ phi lý < 150 ms/từ) → server từ chối thưởng.

## Kết quả thực hiện (2026-11-12)

Đã làm đủ luật và file trong danh sách. Điểm khác so với mô tả ban đầu, có lý do:
- Chuỗi từ ở `shared/src/data/word-chains.ts` (không phải `shared/data/`) vì build `shared` có `rootDir: src`; test đặt cạnh mã nguồn theo quy ước repo, helper ở `shared/test/battle-fixtures.ts`.
- Thêm `herox.battles` (migration `002-battles.sql`): lưu setup (seed, ≤ 40 từ, quái) và giờ bắt đầu, vì bộ từ đã học có thể đổi giữa lúc bắt đầu và lúc gửi kết quả; chạy lại phải dùng đúng setup đã cấp.
- Log input: `{ atMs, kind: 'type', text } | { atMs, kind: 'ring', wordId }`. Server chạy lại toàn bộ log, không tin số liệu client gửi. Client phải ghi log bằng `stepRecorded` (tự bỏ input < 150 ms sau khi đề hiện) để log thật luôn chạy lại khớp.
- Chống gian lận: input < 150 ms sau đề, chọn ô không có trên vòng từ (từ chưa học), sai thứ tự thời gian, log dài hơn thời gian thật kể từ lúc cấp trận (+2 s), trận quá 2 giờ, chốt lần 2 (khoá chính `battle_rewards`).
- Đề hết giờ (10 s, hướng dẫn 15 s) tính như sai. Chỉ thắng mới nhận vàng; thua hoặc rời trận (`fled`) vẫn ghi `word_misses`.
- Loại chiêu: động từ/khác = tấn công; danh từ = khiên (½ sức chiêu, tối đa ½ máu); tính từ = đòn kế của quái −50%; trạng từ/giới từ = né trọn đòn kế. Chiêu hỗ trợ đánh 60%. Đòn kết liễu (chuỗi cụm) hạ luôn quái còn ≤ 25% máu.
- Chuỗi cụm đạt được nhờ cách ra đề: đang dở một chuỗi thì đề kế là từ tiếp theo; 30% đề mở đầu một chuỗi; 40% giữ cùng từ loại với chiêu vừa tung. Từ yếu và từ vừa sai ra nhiều gấp 3.
- Quái tinh anh: 25% mỗi quái khi có từ yếu, mở màn bằng chính từ yếu đó (ưu tiên từ yếu không nằm trong 3 đề vừa hỏi).
- Cấp anh hùng: lên cấp L cần 5×(L−1) từ (cấp 10 = 225 từ, tối đa 50); máu 100 + 10/cấp, sức 10 + 2/cấp. Quái tăng chậm hơn (máu +15%/cấp, đòn +10%/cấp).
- Vòng từ dùng 4 ô đầu của `skill_loadout` (bảng cho 6 ô); 2 ô còn lại để phase 06 quyết định.
- Tách guard chung `server/src/http/api-guard.ts` (rate limit, 503 khi chưa sẵn sàng, xác thực) từ `me-routes.ts`, hành vi `/me` giữ nguyên; hạn mức nay dùng chung cho cả route trận.
- Thêm `@vitest/coverage-v8` 5.1.0 và `npm run test:coverage` (ngưỡng 90% dòng cho `**/src/combat/**`).

Sửa sau review (`plans/reports/code-reviewer-261112-1355-word-combat-review.md`):
- Mỗi người chơi chỉ có một trận mở: bắt đầu trận mới xoá mọi trận trước (khoá dòng `heroes` để request song song không để lại hai trận). Chặn việc mở nhiều trận rồi nộp hàng loạt để nhân vàng.
- Thời gian trận là số nguyên ms: `step` làm tròn xuống `dtMs`; client dùng `BattleFrameClock` để đổi delta lẻ của Phaser (16,67 ms) thành ms nguyên mà không trôi giờ. Trước đó delta lẻ làm `atMs` lẻ và server trả 400.
- Trận đã chốt trả 409 trước khi chạy lại log (đỡ tốn CPU).
- Chưa làm: `rulesVersion` trong setup (deploy giữa trận làm trận đó bị 422); trận bỏ dở của người không chơi lại chỉ bị dọn khi họ bắt đầu trận mới hoặc khi xoá nhân vật.

Kiểm tra: `npm test` 356 test pass; `shared/src/combat` phủ 99,7% dòng; `npm run typecheck`, `npm run build` sạch; `eslint shared server client` sạch (`npm run lint` toàn repo lỗi ở `prototypes/style-preview`, thư mục không thuộc phase này). Test hợp đồng với `../eng/words.json`: cả 30 chuỗi và 8 từ hướng dẫn đều có trong bộ từ.

Chưa kiểm: chạy với Postgres thật (chỉ PGlite); cân bằng số liệu cần playtest ở phase 05.
