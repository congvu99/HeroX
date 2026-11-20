---
phase: 6
title: "Kiểm chứng tổng"
status: completed
effort: "S (0.5 ngày)"
---

# Phase 6: Kiểm chứng tổng

## Steps

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — ghi output.
2. `npm run test:e2e` (auth, battle, chapter-1, citadel-forge, eng-api-isolation).
3. Chạy dev server, chụp màn hình viewport 360x780 (agent-browser): Lexhold, Misty_Fields, Misty_Village, Misty_Chapel, Scarecrow_Lair, 1 trận mỗi theme. Đặt cạnh demo đã duyệt.
4. Quality thấp: xác nhận không có overlay, game vẫn rõ.
5. Đo FPS trước/sau (Lexhold, quality cao).
6. Code review (`/g1:code-review`) trước khi commit.
7. Dừng dev server đã khởi động.

## Acceptance

- Tất cả lệnh xanh; ảnh chụp được người dùng duyệt; báo cáo tách "Đã xác minh" / "Chưa kiểm tra".
- Không tự push/merge; commit theo yêu cầu người dùng.
