---
phase: 2
title: "Track word exposures"
status: done
priority: P1
effort: "4h"
dependencies: []
---

# Phase 2: Ghi lịch sử gặp từ trong HeroX

## Goal

Sau mỗi trận đã chốt, server ghi cho từng từ đã ra đề: số lần gặp, chuỗi đúng liên tiếp, lần gặp cuối vào `herox.word_exposures`; đọc lại được khi dựng trận sau.

## Context

- Migration tự chạy lúc khởi động theo tên file (`server/src/db/migrate.ts`, `server/src/db/migrations/00N-*.sql`); bảng con tham chiếu `herox.heroes ON DELETE CASCADE` để dọn tài khoản đã xoá (`server/src/db/deleted-user-cleanup.ts`).
- `BattleState` đã đếm `misses` theo từ (`shared/src/combat/battle-state.ts:81,393`); chốt trận ghi `word_misses` trong cùng transaction (`server/src/battle/battle-repository.ts:81-118`).
- Dữ liệu chỉ là id từ + số đếm, không có dữ liệu cá nhân.

## Files

- Create: `server/src/db/migrations/005-word-exposures.sql`
- Modify: `shared/src/combat/battle-state.ts` (+ test), `server/src/battle/battle-repository.ts`, `server/src/routes/battle-routes.ts` (+ test, fake repository)

## Tasks & Steps

1. [ ] Migration: `herox.word_exposures (user_id int FK herox.heroes ON DELETE CASCADE, word_id text, seen_count int ≥ 0, correct_streak int ≥ 0, last_seen_at timestamptz, PRIMARY KEY (user_id, word_id))`, có comment đầu file như các migration trước.
2. [ ] `BattleState` thêm `wordResults: ReadonlyMap<string, { prompted: number; trailingCorrect: number; missed: boolean }>`: tăng `prompted` khi hiện đề, tăng `trailingCorrect` khi trả lời đúng, sai/hết giờ thì `missed = true` và `trailingCorrect = 0`. Chỉ là trạng thái suy ra — không ảnh hưởng chọn đề nên không đổi kết quả replay.
3. [ ] `BattleSettlement` thêm `wordResults`; `settleBattle` upsert trong cùng transaction bằng `unnest` (một câu, tham số hoá): `seen_count += prompted`, `correct_streak = CASE missed THEN trailingCorrect ELSE cũ + trailingCorrect`, `last_seen_at = settledAt`.
4. [ ] `readWordExposures(userId): Map<wordId, { correctStreak, lastSeenAtMs }>`; route bắt đầu trận đọc song song cùng các nguồn hiện có (`battle-routes.ts:109`).
5. [ ] Test: battle-state (đúng/sai/hết giờ cập nhật `wordResults`), repository trên PGlite (upsert cộng dồn, sai thì reset chuỗi, chốt hai lần không ghi hai lần), route test truyền exposures vào `prepareBattle`.

## Verification

- `npx vitest run shared/src/combat/battle-state.test.ts server/src/db server/src/routes/battle-routes.test.ts`
- `npm run typecheck`

## Risks / Rollback

- Bảng mới, chỉ thêm; rollback = deploy bản cũ (bảng thừa vô hại). Không đụng `word_misses`.
