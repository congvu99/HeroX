---
phase: 5
title: "Chiêu, kỹ năng di chuyển, hiệu ứng pixelfx"
status: completed
priority: P1
effort: "3d"
dependencies: [3, 4]
---

# Phase 05: Chiêu và hiệu ứng

## Goal
Màn trận trong Phaser nối với `battle-state`, mỗi loại chiêu có hiệu ứng pixelfx riêng, có kỹ năng di chuyển dùng được cả ngoài map; hai kiểu nhập (gõ, vòng từ) hoạt động.

## Bằng chứng pixelfx
MIT cho code và effect (riêng font Patch Pixel không thuộc MIT, không dùng). Render sẵn sprite sheet PNG + JSON kiểu Aseprite bằng `node tools/render.mjs <category>/<name> --sheet`; Phaser đọc được atlas JSON (theo README https://github.com/patch-gg/pixelfx).

## Files to Create
- `tools/render-fx.mjs` — đọc `assets/fx/fx-manifest.json` (danh sách effect + tham số), gọi renderer pixelfx, xuất `client/public/fx/<name>.png|json`. Chạy tay khi đổi manifest, kết quả commit vào repo (build Docker không cần chạy lại).
- `assets/fx/fx-manifest.json` — khoảng 15–20 effect cho chương 1: cast/impact cho 4 loại chiêu × 2 bậc, dash, blink, khiên, buff, combo kết liễu, quái chết, lên cấp.
- `assets/fx/CREDITS.md` — ghi nguồn, license MIT, commit pixelfx đã dùng.
- `shared/data/skill-catalog.ts` — chiêu mới tự thiết kế: mỗi loại chiêu 3 biến thể theo bậc nâng ở tháp phép (phase 06), mô tả hiệu ứng và fx id.
- `client/src/scenes/battle-scene.ts` — dựng sân, quái, HUD (máu, đề, thanh combo), phát sự kiện từ `battle-state` thành hoạt ảnh + fx.
- `client/src/ui/typing-input.ts` — input ẩn (`autocapitalize=off`, `autocorrect=off`, `spellcheck=false`), hiện chữ đang gõ trên canvas.
- `client/src/ui/word-ring.ts` — vòng 6 ô, ô ≥ 44pt cho ngón tay, phản hồi chạm.
- `client/src/fx/fx-player.ts` — phát atlas theo `meta.pixelfx` (fps, loop, pivot), pool đối tượng để không tạo rác mỗi khung.
- `client/src/world/movement-skills.ts` — dash (lướt ngắn, i-frame), blink (dịch chuyển qua khe hẹp): ngoài map tung bằng phím tắt hoặc nút cảm ứng, cần đã học ≥ N trạng từ/giới từ; trong trận dùng để né đòn quái.

## Tasks
1. Cài pixelfx theo README (`npm i github:patch-gg/pixelfx`, khoá commit hash) chỉ ở devDependencies cho tool render.
2. Giới hạn kích thước atlas ≤ 2048×2048 mỗi tấm (an toàn cho WebGL iPhone).
3. Đổi kiểu nhập trong cài đặt; mặc định theo thiết bị (cảm ứng → vòng từ).
4. Âm thanh hit/cast đơn giản (CC0), tắt được.

## Verification
- Chạy trận thử với fixture 20 từ: gõ, vòng từ, combo 3 từ, combo cụm, sai từ đứt chuỗi đều thấy hiệu ứng đúng.
- DevTools Performance: một trận 60 giây không có GC spike > 8 ms trên PC.
- `CREDITS.md` liệt kê mọi effect trong manifest (test so khớp).

## Kết quả

### Đã làm
- pixelfx khoá commit `044e12a45dc9cc312cec50ee606dfc98afe5adc2` (devDependency). 21 effect trong manifest, render 15 fps, atlas lớn nhất 1456×1350; `client/public/fx` ~3,5 MB, ước ~51 MB bộ nhớ GPU nếu nạp hết.
- `skill-catalog.ts` đặt ở `shared/src/data/` (theo `rootDir` của gói shared, giống dữ liệu phase 04): 4 loại × 3 bậc, tên tiếng Việt tự đặt; từ đã thuộc hiện fx cao hơn 1 bậc; `MOVEMENT_SKILLS` (lướt ≥ 5, thuấn bộ ≥ 15 trạng từ + giới từ).
- Màn trận, gõ/vòng từ, đổi kiểu nhập + bật/tắt âm thanh, lướt (Space) / thuấn bộ (E) + nút cảm ứng, BattleTrigger mở trận.

### Khác plan
- Âm thanh tổng hợp bằng Web Audio thay vì file CC0: không cần tải, không phải theo dõi license.
- Trong trận, kỹ năng di chuyển là hoạt ảnh của chiêu né (trạng từ/giới từ), không thêm input mới để giữ nguyên hợp đồng replay của server.
- Thêm `client/src/api/api-request.ts` (tách hàm đọc lỗi dùng chung với `me-api.ts`, không đổi hành vi) và `battle-api.ts`.

### Kiểm chứng
- `npm run typecheck`, `npx eslint shared server client tools`, `npx vitest run` (38 file / 402 test), `npm run build`: đạt.
- Chromium thật (Playwright, Vite dev, fixture 20 từ): gõ 60 s thắng trận, combo ×N, chuỗi "run away quickly" ×1.6 kết liễu, từ sai đứt combo + quái đánh trả, khiên đỡ, né; vòng từ trên giả lập cảm ứng (mặc định chọn vòng từ) thắng trận. Không lỗi console. Thuấn bộ dời hero 96 px; fx di chuyển nạp ở world, fx trận chỉ nạp ở màn trận.
- GC trong trace 60 s (gõ) và 40 s (vòng từ): 0 lần > 8 ms, lâu nhất ~2,2 ms. Đo trên máy chủ không GPU (SwiftShader), chỉ là tham khảo.

### Chưa kiểm
- Đo DevTools trên PC có GPU thật và trên iPhone thật (bàn phím ảo, WebGL, bộ nhớ GPU).
- Trận với server thật (`POST /battles` + gửi kết quả) chưa chạy trên trình duyệt; chỉ có test đơn vị cho client API và test server của phase 04.
- Nghe thử âm thanh.

### Sau review (`plans/reports/code-reviewer-261112-1437-skills-fx-review.md`)
- Đã sửa: lời gọi mạng của trận cũ không còn ghi đè trận mới (số thứ tự trận `battleRun`); setup server sai → báo lỗi thay vì treo; gửi kết quả lỗi → nút "Thử lại" (server trả 409 nếu đã chốt, không phát thưởng 2 lần); về bản đồ thì reset phím (World `RESUME`) và thả joystick/huỷ yêu cầu chiêu (UiScene `WAKE`); Enter khi đề còn khoá thì giữ chữ; kiểm `missedWordIds`; bắt lỗi `resume/close` AudioContext; mô tả chiêu khớp cơ chế; bỏ magic string fx.
- Đã kiểm lại: typecheck, lint, 403 test, build; Chromium: trận gõ 20 s thắng, rời trận → về bản đồ → vào trận lần 2 đúng, không lỗi. Bundle build không chứa bộ từ thử dev.
- Để lại (low): một mảng mới mỗi khung trong `tick` (đo không gây GC > 8 ms), hằng timeout lặp giữa hai file API, prefix `fx` khớp rộng, dọn ô gõ/AudioContext khi HMR (chỉ dev), toạ độ HUD còn số trực tiếp ở vài chỗ.
