---
status: done
skill: g1:atoz
gate: 3
updated: 2026-11-20T05:00:00Z
---

# Hợp đồng A-to-Z: portrait-only + bầu trận/HUD DOM

## Objective
Hoàn tất toàn bộ kế hoạch portrait (360×780, xoay sân trận sang dọc, bỏ landscape) — Phase 2, 3, 4 — trên nền code plan 1005 (bầu trận Phaser + HUD DOM, "xong code chờ xem máy"). Gộp cả hai vào một feature branch.

## Done means
- Phase 2: sân trận xoay dọc (hiệp sĩ dưới nhìn lên / quái trên); animation + FX theo trục dọc; `battle-arena-layout.test.ts` + `battle-cues.test.ts` xanh.
- Phase 3: HUD trận + panel thành trì + joystick vừa khung dọc; bỏ nhánh CSS landscape + tham chiếu `#rotate-hint`.
- Phase 4: E2E 2 project khung dọc xanh toàn flow; README cập nhật.
- Toàn cục: `npm run typecheck`, `npm run lint` (trừ lỗi pre-existing `prototypes/`), `npm test`, `npm run test:coverage` (combat ≥90%), `npm run build` xanh.
- Review isolation sạch.
- Commit + push `feature/portrait-and-battle-arena` lên GitHub origin.

## Out of scope
- KHÔNG mở PR (user tự mở trên GitHub).
- KHÔNG merge, KHÔNG push master.
- KHÔNG đổi logic trận shared/combat, API, art/tileset.

## Gate 2 defaults
- Feature branch: `feature/portrait-and-battle-arena` (tạo từ master, mang theo working tree dở dang của 1005 + Phase 1 portrait).
- Host GitHub (không Bitbucket) → dừng ở commit+push, không dùng pipeline ship.
- Số cột×hàng sân dọc: ~6×10, chốt theo chiều cao HUD khi làm Phase 2.
- E2E desktop project: thay bằng device Chromium dọc (Pixel) để giữ 2 engine.

## Stop conditions
- Hành động phá hủy/không hồi (xóa data, force-push, rewrite history).
- Thay đổi Done-means đã chốt hoặc rời scope.
- Lỗi không giải thích được sau chẩn đoán + advisor.

## Authority granted
- Commit + push feature branch lên GitHub origin (user chốt).

## Decisions made
- 2026-11-20: Gộp 1005 + portrait vào 1 branch (portrait Phase 2-3 sửa đè code 1005, không tách được).
- Phase 1 portrait: đã xong (display 360×780, bỏ rotate-hint, manifest portrait, test cập nhật).
- Phase 2: sân dọc 6×11 ô (384×704); hiệp sĩ chân (192,552) nhìn lên, quái (192,168); tween x→y đúng dấu; FX xoay ±90° (lên/xuống) thay flipX; animation hiệp sĩ hàng UP_ROW=0.
- Phase 3: bỏ nhánh media query landscape trong battle-hud.css (bố cục absolute mặc định đã responsive); joystick không đổi (chỉ ở ui-scene đi map, không trong trận); panel thành trì đã dùng min(640px,100%)+column, tự vừa dọc.
- Phase 4: đổi E2E project desktop-chrome → pixel-5 (Chromium dọc); cập nhật E2E_PROJECT_NAMES.

## BLOCKER (gate 3 stop)
- Chạy E2E tự dựng bị chặn: worktree khác `D:\project\HeroX-base` đang giữ cổng cố định 3180/5181/55432 (process không thuộc session này, không được kill). Cần user tắt stack HeroX-base hoặc cho phép dùng cổng khác.
