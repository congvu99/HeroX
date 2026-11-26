---
title: "Phase 3: Kiểm chứng trong game và cập nhật docs"
status: done
priority: P1
effort: "1h"
dependencies: [1, 2]
---

# Phase 3: Kiểm chứng trong game và cập nhật docs

## Steps

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (ít nhất `chapter-1.spec.ts`). Ghi lệnh và dòng
   tổng kết.
2. Chạy `npm run dev` (cổng cố định 5180/3180; bận thì dừng process cũ của project, không đổi cổng). Dùng dev world:
   - Chưa xong chương 1: đi vào cổng đông thì báo khoá, không chuyển map.
   - Đặt tiến độ xong chương 1 và đủ 100 từ (qua dev backend hoặc fixture, không sửa dữ liệu thật): qua cổng đông thì
     vào `Ash_Forest/from-lexhold`; đi cổng về thì tới `Lexhold/from-ash-forest`.
   - Tải lại trang khi đang ở chương 2 thì vào thẳng Ash_Forest.
   - Chụp ảnh vào `plans/261126-1605-chapter-transition/assets/`.
3. Thêm e2e nếu `e2e/support` dựng được tiến độ chương 2 gọn; không thì ghi rõ là kiểm thủ công.
4. Cập nhật `docs/system-architecture.md` các dòng Scene, Map, Truyện: cổng xuyên chương, Lexhold làm trung tâm, boot
   chọn chương theo tiến độ.
5. Dừng dev server do phase này khởi động.

## Success Criteria

Báo cáo tách "Đã xác minh" và "Chưa kiểm tra"; câu hỏi còn mở để cuối.
