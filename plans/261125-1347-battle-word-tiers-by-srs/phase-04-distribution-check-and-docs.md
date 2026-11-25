---
phase: 4
title: "Distribution check and docs"
status: done
priority: P2
effort: "3h"
dependencies: [3]
---

# Phase 4: Kiểm phân bố đề và cập nhật tài liệu

## Goal

Có một test tự động chứng minh hết lặp/hết toàn từ dễ theo tiêu chí của plan, và tài liệu kiến trúc mô tả đúng cách chọn từ mới.

## Files

- Create: `server/src/battle/word-distribution.test.ts`
- Modify: `docs/system-architecture.md` (dòng 13: thêm `word_exposures`; dòng 57: lịch sử gặp từ; dòng 60: cách dựng bộ từ theo nhóm)

## Tasks & Steps

1. [ ] Test mô phỏng: 2000 từ đã học có đủ 5 nhóm (gồm mọi từ của `WORD_CHAINS`), 12 từ hay sai; 10 trận liên tiếp, mỗi trận `prepareBattle` → 20 đề bằng `pickPromptWord` (giả định trả lời đúng, combo giữ) → cập nhật map exposures như `settleBattle`, thời gian tăng 30 phút mỗi trận.
2. [ ] Khẳng định: đề rơi vào từ chuỗi cụm ≤ 25%; không từ nào > 3 lần trong 10 trận; 12 từ hay sai hết nhóm Khó sau khi đúng 2 lần liên tiếp; bộ từ trận thường khớp hạn ngạch ±1.
3. [ ] Cập nhật `docs/system-architecture.md`.
4. [ ] Chạy toàn bộ kiểm tra.

## Verification

- `npm run typecheck && npm run lint && npm test && npm run test:coverage`
- E2E không bắt buộc (không đổi UI); chạy `npm run test:e2e` nếu môi trường sẵn, ghi rõ nếu không chạy.
