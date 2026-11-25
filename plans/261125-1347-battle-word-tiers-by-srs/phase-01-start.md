---
phase: 1
title: "Phân nhóm từ theo SRS"
status: done
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Phân nhóm từ theo SRS

## Goal

Mỗi từ đã học được xếp vào đúng một nhóm `new | due | hard | familiar | mastered` từ dữ liệu SRS LingoBrain (đọc thêm `due`, `reps`, `state`, `ef`, lượt chấm cuối) và cờ "hay sai trong HeroX" do caller truyền vào.

## Context

- `server/src/learning/learning-stats.ts:87` `readSrsRecord` chưa đọc `due`, `reps`; `LearnedWordProgress` (dòng 234) chỉ có `mastered`, `lapses`.
- Payload LingoBrain có đủ trường (`server/src/learning/contract-eng-payload.test.ts:19`). Thang chấm: 0 quên · 1 khó · 2 nhớ · 3 dễ.
- `ef` của LingoBrain (`eng/js/srs-scheduler.js` `applyGrade`, `sm2Ease`): bắt đầu 2.5; quên −0.2; "khó" −0.14; "nhớ" giữ; "dễ" +0.1. `lapses` không bao giờ giảm → không dùng `lapses` làm tiêu chí Khó (sẽ lại thành "yếu mãi").

## Files

- Create: `shared/src/combat/word-tier.ts` — `WORD_TIERS` (`as const`) và kiểu `WordTier`; export qua `shared/src/index.ts`. Đặt ở shared vì hạn ngạch theo trận (phase 3, `encounters.ts`) dùng chung kiểu này.
- Create: `server/src/battle/word-tier-classifier.ts` + `.test.ts`.
- Modify: `server/src/learning/learning-stats.ts` (+ test).

## Tasks & Steps

1. [ ] `readSrsRecord`: đọc thêm `due`, `reps` (đọc phòng thủ như trường khác, thiếu thì 0).
2. [ ] `LearnedWordProgress` thêm `state`, `ivl`, `ef`, `due`, `reps`, `lastGrade: number | null` (điểm của lượt chấm muộn nhất trong `hist`). Giữ `mastered`, `lapses` để không đổi chỗ gọi khác; nơi gọi `listLearnedWords`: `battle-routes.ts:120`, `citadel-routes.ts:119` — chỉ thêm trường, không đổi hành vi.
3. [ ] `classifyWordTier(progress, missedInHerox: boolean, now: number): WordTier`, xét theo thứ tự, gặp điều kiện đầu tiên thì dừng:
   - `hard`: `ef < HARD_EASE_THRESHOLD` (2.2 ≈ quên 2 lần, hoặc quên 1 + "khó" 1 mà chưa gỡ bằng "dễ"), hoặc `lastGrade ≤ 1`, hoặc `missedInHerox`.
   - `new`: `state` là `learning`/`relearn`, hoặc `reps ≤ NEW_WORD_MAX_REPS` (2).
   - `due`: `due ≤ now`.
   - `mastered`: `ivl ≥ 21` (dùng chung hằng số `MASTERED_INTERVAL_DAYS` — đưa ra export trong `learning-stats.ts`, không khai báo lại).
   - còn lại `familiar`.
   Comment tiếng Việt cho từng luật và lý do ngưỡng.
4. [ ] Test bảng: mỗi nhóm một ca, ca chồng điều kiện (đến hạn + ef thấp → `hard`; đã thuộc + đến hạn → `due`), `hist` rỗng → `lastGrade = null`.

## Verification

- `npx vitest run server/src/learning server/src/battle/word-tier-classifier.test.ts`
- `npm run typecheck`

## Risks

- Ngưỡng `ef` chưa kiểm trên dữ liệu thật: phase 4 in tỉ lệ nhóm trên fixture; nếu nhóm Khó quá đông/quá rỗng ở người chơi thật thì chỉnh hằng số, không đổi cấu trúc.
