---
title: "Phase 1: Chụp ảnh trước và chốt câu hỏi"
status: done
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Chụp ảnh trước và chốt câu hỏi

## Overview

Lưu ảnh bản đồ hiện tại để so trước/sau, và chốt 3 câu hỏi mở trong brainstorm trước khi tiêu lượt PixelLab. Không tốn lượt.

## Requirements

- Ảnh chụp trước của Lexhold, Misty_Fields, Misty_Village (khung 360×780, cùng vị trí camera sẽ dùng ở phase 6).
- Câu trả lời của người dùng: ngân sách lượt, cỡ cây (1 ô hay 2×2), có gộp tường thành/tháp/nhà nguyện không.

## Implementation Steps

1. Khởi động `npm run dev` (cổng cố định 5180/3180; cổng bận thì dừng process cũ, không đổi cổng).
2. Vào map bằng nút "Vào map thử (dev)", dời hero tới 3 level, chụp bằng Playwright hoặc `window.__HEROX_GAME__`.
   Ghi lại toạ độ hero mỗi ảnh để phase 6 chụp đúng chỗ.
3. Lưu ảnh vào `plans/261125-1457-map-houses-trees-roads-reskin/assets/before-<level>.png`.
4. Ba câu hỏi đã được chốt lúc lập plan (plan.md mục Quyết định đã chốt): chỉ cần chụp thêm Misty_Chapel cho phase 7.
5. Đọc lại `/v2/balance`; ghi số lượt còn lại vào plan.md (lúc lập plan: 12/40).

## Todo

- [ ] 4 ảnh trước (Lexhold, Misty_Fields, Misty_Village, Misty_Chapel) + toạ độ hero
- [x] Chốt ngân sách, cỡ cây, phạm vi (2026-11-25)

## Success Criteria

3 file ảnh `before-*.png` tồn tại; plan.md ghi đủ 3 quyết định và số lượt còn lại. Dừng dev server nếu phase này tự khởi động nó.
