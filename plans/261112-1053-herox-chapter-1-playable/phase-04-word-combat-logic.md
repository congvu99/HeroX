---
phase: 4
title: "Hệ chiến đấu bằng từ (logic thuần)"
status: pending
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
