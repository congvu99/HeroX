---
phase: 5
title: "Chiêu, kỹ năng di chuyển, hiệu ứng pixelfx"
status: pending
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
