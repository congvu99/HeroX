---
status: done
skill: g1:atoz
gate: 3
updated: 2026-11-20T17:55:00+07:00
---
# Brief
Objective: hoàn tất re-skin chương 1 + việc còn lại, commit, push nhánh.
Done means:
- Nit review sửa: hằng có tên (golden-hour-*), test GoldenHourAtmosphere, texture tia nắng rẻ hơn.
- Placeholder Building vẽ theo phong cách Kenney (không gothic tối).
- Resize: dải màu/tia nắng/sun wash tạo lại khi đổi kích thước game.
- typecheck, npm test, build, Playwright e2e xanh; ảnh sân trận làng/hầm chụp.
- Review độc lập g1:code-reviewer sạch.
- Commit (không dấu vết AI), push feature/portrait-and-battle-arena lên origin (GitHub). Không PR, không merge.
- (user thêm 17:3x) Ánh sáng 3 preset: sunny (Lexhold, Fields, trận field), sunset đỏ bóng sâu (Village, trận forge), moonlight (Chapel, Lair, trận lair).
Out of scope: logic trận, server, story, PixelLab, xoá asset DCSS.
Authority: push nhánh feature lên GitHub (user chọn, remote không phải Bitbucket).
Decisions: làm trên cây hiện tại, không worktree (thay đổi chưa commit).
Pushed eee662b. Ảnh 3 preset chưa chụp được (headless hạ quality).
