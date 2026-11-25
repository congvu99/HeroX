---
phase: 3
title: "Quota based battle pool"
status: done
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Bộ từ trận theo hạn ngạch nhóm

## Goal

`prepareBattle` dựng bộ ≤ 40 từ: vòng từ trước, rồi chia slot còn lại theo hạn ngạch nhóm của loại trận, trong mỗi nhóm ưu tiên từ lâu chưa gặp; không kéo từ chuỗi cụm vào bộ.

## Context

- `shared/src/combat/word-pool.ts:48` `selectBattleWords` chỉ server gọi (`server/src/battle/battle-preparation.ts:89`); `availableChains` vẫn được `battle-state.ts:436` dùng → giữ nguyên.
- `pickPromptWord` không đổi: đề trong trận vẫn bốc từ bộ, từ `weak` nặng gấp 3, chuỗi chỉ ra khi đủ từ trong bộ.

## Files

- Modify: `shared/src/combat/encounters.ts`, `shared/src/combat/word-pool.ts` (+ test), `shared/src/index.ts`, `server/src/battle/battle-preparation.ts` (+ test), `server/src/routes/battle-routes.ts`

## Tasks & Steps

1. [ ] `Encounter` thêm `wordMix?: 'field' | 'boss'` (thiếu = `field`); gắn `boss` cho 5 trận trùm (`SCARECROW_BOSS`, `CH2..CH5_BOSS`).
2. [ ] `word-pool.ts`: `WORD_MIX_QUOTAS` (phần trăm, comment tiếng Việt lý do): field = new 30 / due 25 / hard 25 / familiar 15 / mastered 5; boss = hard 40 / due 25 / new 15 / familiar 15 / mastered 5.
3. [ ] Viết lại `selectBattleWords(buckets: Record<WordTier, readonly BattleWord[]>, mix, loadout, limit = 40)` thuần, không cần rng: thêm từ vòng từ; chia slot còn lại theo hạn ngạch (phần dư lớn nhất để tổng khớp); lấy từ đầu mỗi nhóm; slot thừa do nhóm thiếu từ dồn theo thứ tự `due → hard → new → familiar → mastered`. Bỏ `MAX_WEAK_WORDS_IN_POOL`, `MAX_CHAINS_IN_POOL`, tham số `chains`.
4. [ ] `battle-preparation.ts`: input thêm `exposures`, `now`. Mỗi từ: `missedInHerox = misses > 0 && correctStreak < WEAK_CLEAR_STREAK (2)`; xếp nhóm bằng `classifyWordTier`; `BattleWord.weak = tier === 'hard'`, `mastered` giữ nghĩa cũ (chiêu mạnh).
5. [ ] Thứ tự trong nhóm (tất định theo seed): `rng.shuffle` → sắp ổn định: từ chưa gặp trong `EXPOSURE_COOLDOWN_MS` (12 giờ) đứng trước, xếp theo ưu tiên nhóm (`hard`: độ yếu giảm dần; `due`: quá hạn lâu nhất trước); từ vừa gặp đứng sau, gặp lâu nhất trước.
6. [ ] Trận hướng dẫn: 8 từ cố định vào một nhóm, giữ nguyên kết quả. Trận `masteredOnly`: lọc nguồn như cũ rồi mới chia nhóm.
7. [ ] Route truyền `exposures` và `now()`.
8. [ ] Viết lại test `word-pool` (hạn ngạch đúng, dồn slot, vòng từ luôn có, không trùng, ≤ limit) và `battle-preparation` (nhóm Khó gỡ sau 2 lần đúng, từ vừa gặp xếp sau, tất định theo seed, test hướng dẫn/masteredOnly cũ vẫn pass).

## Verification

- `npx vitest run shared/src/combat server/src/battle server/src/routes/battle-routes.test.ts`
- `npm run typecheck && npm run lint`

## Risks

- Combo chuỗi cụm hiếm đi (người dùng đã chấp nhận). Phase 4 đo tỉ lệ thực.
- Đổi chữ ký export `selectBattleWords` của gói shared: chỉ server gọi (đã grep), không ảnh hưởng client.
