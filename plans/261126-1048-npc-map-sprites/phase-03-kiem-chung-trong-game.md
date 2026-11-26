---
title: "Phase 3: Kiểm chứng trong game"
status: done
priority: P1
effort: "45m"
dependencies: [1, 2]
---

# Phase 3: Kiểm chứng trong game

## Overview

Chụp mỗi NPC trên bản đồ trong game thật, xác nhận không còn hình tạm, trùm 128 px không che lối, hộp thoại vẫn đúng
chân dung. Chạy bộ kiểm tra đầy đủ.

## Implementation Steps

1. `npm run typecheck`, `npm run lint`, `npm test`. Ghi lệnh và dòng tổng kết vào báo cáo.
2. Khởi động `npm run dev` (cổng cố định 5180/3180; cổng bận thì dừng process cũ, không đổi cổng). Phải khởi động mới
   sau phase 2 vì `import.meta.glob` không thấy file asset mới.
3. Vào map bằng nút "Vào map thử (dev)", dùng `window.__HEROX_GAME__` dời hero tới cạnh NPC ở 8 level chương 2–5
   (bảng plan.md), khung 360×780. Lưu ảnh vào `plans/261126-1048-npc-map-sprites/assets/after-<Level>.png`.
4. Với 1 NPC thường (`chained-soul`) và 1 trùm (`antonym-demon`): mở hội thoại, chụp, xác nhận chân dung đúng.
5. Đi vòng quanh NPC trùm: hero không kẹt, hình trùm không che cổng hay lối duy nhất. Có vấn đề thì báo người dùng,
   không tự đổi cỡ hay toạ độ.
6. Dừng dev server do phase này khởi động.

## Todo

- [x] typecheck, lint, test pass
- [x] 8 ảnh after-<Level>.png
- [x] 2 ảnh hộp thoại
- [x] Dừng dev server

## Success Criteria

Không level nào còn hình tạm NPC; báo cáo tách "Đã xác minh" và "Chưa kiểm tra" (ví dụ chương 1 không chụp lại vì không
đổi); câu hỏi còn mở để cuối.
