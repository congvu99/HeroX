---
title: "Chọn từ ra đề theo nhóm SRS LingoBrain"
description: "Bộ từ mỗi trận trộn theo hạn ngạch 5 nhóm (mới, đến hạn, khó, quen, đã thuộc) từ dữ liệu SRS LingoBrain và lịch sử gặp từ trong HeroX, để hết lặp và hết toàn từ dễ."
status: done
priority: P1
effort: "2d"
branch: master
tags: [feature, backend, database]
blockedBy: []
blocks: []
created: 2026-11-25
---

# Chọn từ ra đề theo nhóm SRS LingoBrain

## Overview

Bộ từ mỗi trận trộn theo hạn ngạch 5 nhóm (mới, đến hạn, khó, quen, đã thuộc) từ dữ liệu SRS LingoBrain và lịch sử gặp từ trong HeroX, để hết lặp và hết toàn từ dễ. Căn cứ: [brainstorm](../reports/brainstorm-261125-1235-battle-word-selection-difficulty.md) — mô phỏng hiện tại 74% đề rơi vào 126 từ chuỗi cụm, 20% vào 12 từ yếu cố định.

Quyết định đã chốt: tỉ lệ cân bằng; chuỗi cụm chỉ dùng khi đủ từ trong bộ (không kéo từ chuỗi vào); thêm bảng `herox.word_exposures`.

Quyết định của plan: **không đổi logic ra đề trong trận** (`pickPromptWord`, `RECENT_PROMPT_MEMORY`, `CHAIN_START_CHANCE`) — chỉ đổi cách server dựng bộ từ. Setup đã lưu lúc vào trận nên trận đang dở lúc deploy vẫn replay khớp; câu hỏi mở về phiên bản thuật toán trong brainstorm không còn cần.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Phân nhóm từ theo SRS](./phase-01-start.md) | Done |
| 2 | [Phase 2: Track word exposures](./phase-02-track-word-exposures.md) | Done |
| 3 | [Phase 3: Quota based battle pool](./phase-03-quota-based-battle-pool.md) | Done |
| 4 | [Phase 4: Distribution check and docs](./phase-04-distribution-check-and-docs.md) | Done |

Phụ thuộc: 1 và 2 độc lập; 3 cần 1 + 2; 4 cần 3.

## Success Criteria

- [x] Kiểm tra phân bố (phase 4, 10 trận × 20 đề, vốn từ 2000, giả lập ghi `word_exposures` giữa các trận): từ chuỗi cụm ≤ 25% đề; không từ nào ra > 3 lần trong 10 trận (không tính đề ra lại sau khi sai).
- [x] Mỗi trận thường có đúng hạn ngạch nhóm (±1 từ) khi mọi nhóm đủ từ; nhóm thiếu thì dồn sang nhóm kế, bộ vẫn đủ 40 khi có ≥ 40 từ đã học.
- [x] Từ sai trong HeroX hết bị xếp nhóm Khó sau 2 lần đúng liên tiếp.
- [x] Trận hướng dẫn và trận `masteredOnly` giữ hành vi cũ (test hiện có pass).
- [x] `npm run typecheck`, `npm run lint`, `npm test` pass; phủ dòng `shared/src/combat` ≥ 90% (`npm run test:coverage`).

## Validation Log

### Session 1 (2026-11-25)

Verification: tham chiếu `file:line` trong các phase đã kiểm lại (`learning-stats.ts:87,234`, `battle-preparation.ts:89`, `battle-state.ts:436`, `battle-routes.ts:109,120`, `citadel-routes.ts:119`, migrations 001–004). `g1 plan validate`: hợp lệ. Failed: 0.

| Câu hỏi | Chốt |
|---|---|
| Số lần đúng liên tiếp để gỡ "yếu" | 2 (`WEAK_CLEAR_STREAK`) — phase 3 |
| Thời gian nghỉ từ vừa gặp | 12 giờ (`EXPOSURE_COOLDOWN_MS`) — phase 3 |
| Ngưỡng `ef` nhóm Khó | `< 2.2` (`HARD_EASE_THRESHOLD`) — phase 1 |

Sweep: các phase đã ghi đúng giá trị trên; không cần sửa thêm.

## Ngoài phạm vi

SRS riêng của HeroX; ghi ngược LingoBrain; cột độ khó trong bộ từ; đổi UI; đổi luật ra đề trong trận.
