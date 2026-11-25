---
status: active
skill: g1:atoz
gate: 3
updated: 2026-11-23T14:19:00+07:00
---

# Hợp đồng atoz — HeroX: asset PixelLab + chương 2–5 + dọn phase 7–9

## Objective
Đưa HeroX từ "chương 1 chơi được với asset tạm (Kenney/LPC/DCSS)" lên "5 chương chơi
trọn với bộ asset chính thức do PixelLab sinh (hero, quái, trùm, tile, chân dung), chất
lượng thật, có recipe tái tạo", đồng thời dọn hết việc dang dở phase 7–9 mà agent làm được.
Kết thúc bằng PR về master (GitHub), không merge.

## Done means (nghiệm thu — mỗi mục kiểm được)
1. (SỬA 2026-11-20) Hero GIỮ sheet LPC hiện có (PixelLab animation không đạt — xem Phát hiện gate 3).
   Asset PixelLab cho CẢ 5 chương: quái thường, quái tinh anh, trùm (128px), tile map,
   chân dung hội thoại — sinh từ PixelLab; mỗi asset có recipe (prompt+seed+size+ref) trong tools/pixellab/art-recipes.json
   và credit trong assets/credits.json. `node tools/build-credits.mjs` chạy sạch, test
   asset-credits xanh.
2. Hệ render khớp asset mới: battle-HUD, roaming monster, lighting preset vẫn chạy với
   sheet mới; không vỡ hoạt ảnh trận.
3. docs/art-direction.md viết lại: PixelLab là nguồn chính, ghi pipeline sinh/khớp.
4. Chương 2–5 (Rừng Tro, Hầm Mộ Thánh, Vực Lửa, Thiên Cung Vỡ): mỗi chương có story data,
   enemies, word-chains, map LDtk sinh tất định, encounter, mốc mở khóa, đăng ký vào
   STORY_CHAPTERS; chơi trọn tới kết chương; test dữ liệu xanh.
5. Phase 7–9 (phần agent làm được): sửa lỗi review code, cân bằng số liệu, icon/manifest PWA,
   atlas budget, E2E tự động rút gọn tới kết mỗi chương; typecheck/lint/test/build đều xanh.
6. PR mở về master trên GitHub (không merge).

## Out of scope
- Merge PR; push/sửa repo eng (PR eng #1 là việc người dùng).
- Chơi thử iPhone/Safari thật, đo Lighthouse/fps, chơi thử server thật (cần thiết bị → Open items).
- Cơ chế gameplay mới ngoài những gì phase 10 mô tả.
- Mua gói PixelLab trả phí.

## Constraints
- KHÔNG dùng model fable (người dùng yêu cầu). Orchestrator + subagent code/review dùng Opus; Sonnet cho quét/tra cứu.
- API key chỉ đọc từ env PIXELLAB_API_KEY; KHÔNG ghi giá trị ra file/log/commit/báo cáo.
- Chỉ SELECT trên public.*; ghi schema herox.
- Map .ldtkl sinh tất định (không sửa tay).
- Không AI-attribution trong git (commit/PR/branch).
- Repo host là GitHub (không Bitbucket) — người dùng đã cho phép dùng gh CLI mở PR GitHub (ghi đè ràng buộc Bitbucket của kit cho repo này).

## Gate 2 defaults (người dùng có thể override)
- Nhánh tích hợp: feature/herox-pixellab-art-chapters-2-5 từ origin/master.
- Test: npm run typecheck && npm run lint && npm test && npm run build; E2E: npm run test:e2e.
- Asset recipe → tools/pixellab/art-recipes.json; credit → assets/credits.json.
- Plan uncommitted trong repo.

## Granted authority
- Dùng gh CLI mở PR trên GitHub (host khác Bitbucket) — người dùng duyệt 2026-11-20.
- Đọc PIXELLAB_API_KEY từ env để gọi api.pixellab.ai.

## Stop conditions
- PixelLab trả lỗi không giải thích được (KHÔNG phải hết quota).
- Hết lượt tạo ảnh PixelLab: KHÔNG dừng — dùng tạm asset đã có (đã sinh được +
  Kenney/LPC/DCSS cũ), đánh dấu rõ asset nào còn tạm trong báo cáo + recipe;
  người dùng bổ sung sau (quyết định user 2026-11-20 18:22).
- Sprite hoạt ảnh PixelLab không khớp hệ render ở mức dùng được sau khi đã thử.
- Hành động phá hủy/ngoài scope/ngoài repo; cần chạm repo eng hoặc thiết bị thật.
- Cuối phiên không mở được PR tự động (gh thiếu + không có token) → dừng ở push, báo người dùng.

## Prerequisites
- [x] PIXELLAB_API_KEY user-level env var — SET (len=37, prefix pixl_), balance call HTTP 200. Xác minh 2026-11-20 18:24.
- [ ] (cuối phiên) gh CLI đăng nhập HOẶC GH_TOKEN/GITHUB_TOKEN trong env. Hiện gh KHÔNG tìm thấy trên máy → xử lý ở bước PR.

## Decisions made
- 2026-11-20: Phạm vi = toàn bộ asset bằng PixelLab + chương 2–5 + dọn phase 7–9 (user Confirm, 1 PR).
- 2026-11-20: Host GitHub, mở PR bằng gh CLI (user chọn).
- 2026-11-20: Nguồn quyết định gameplay chương 2–5 = phase-10-chapters-2-5.md của plan 261112-1053.
- 2026-11-20 18:22: Hết lượt tạo ảnh PixelLab thì dùng tạm asset đã có, không dừng; user bổ sung sau.
- 2026-11-20 18:36 (sau Explore map pipeline):
  - Hero art: GIỮ layout sheet 192px, row up/left/down/right, cột theo hero-sprite/hero-battle-animations hiện có. PixelLab sinh frame rồi ghép vào sheet cũ → KHÔNG đổi code render hero. Thay tăng dần (thiếu sheet vẫn chạy).
  - Quái/trùm/chân dung/tile: PNG đơn drop-in theo path + credits + recipe; màu trung tính (runtime MULTIPLY tint).
  - Map chương 2–5: Option A = 1 project LDtk/chương + thêm cơ chế chọn map theo chương (thay START_MAP_PATH hardcode ở scene-keys.ts:28). Đây là code gap thật, làm TRƯỚC, serial.
  - File registry DÙNG CHUNG (encounters.ts, story-rules.ts, index.ts, battle-actors.ts, lighting-presets.ts, battle-arena-layout.ts, story-types.ts): KHÔNG sửa song song → serialize edit các file này.
  - Ngưỡng mở khóa chương 2–5 ĐÃ có sẵn (CHAPTER_UNLOCKS). Beat id = DB story_progress.beat → không đổi tên beat ch1.
  - Nguồn pipeline: plans/reports/Explore-261120-1826-art-and-chapters-pipeline.md.
- 2026-11-23: Lỗi review #3 (forge-lock) user chốt "chỉ khoá khi chưa nâng lò rèn". Vì BASE_FORGE_LEVEL=1
  (người mới cũng cấp 1, không ai có cấp 0) nên hiện thực thành "không khoá khi forgeLevel > BASE_FORGE_LEVEL";
  người mới (cấp gốc 1) vẫn khoá theo mốc smith-rescued. Thuần code, không đụng DB.
- 2026-11-23: 8 lỗi review phase 7–9 + 2 điểm sw.js đã sửa; +3 test, 633 pass; typecheck/build sạch.
  D1 art-direction.md viết lại. Còn: E2E + code-review cô lập + mở PR về master (KHÔNG merge, KHÔNG push master).
- 2026-11-23: Host thực tế là GitHub (origin congvu99/HeroX), KHÔNG phải Bitbucket như skill mặc định.
  gh CLI không có trên PATH, không có GH_TOKEN/GITHUB_TOKEN env. Bước mở PR: thử gh → REST → nếu không được,
  dừng ở push nhánh feature (KHÔNG push master), báo user tự mở PR.

## De-risk PixelLab (đã kiểm 2026-11-20 18:xx)
- generate-image-pixflux: sinh hero crusader 64×64 chất lượng đạt art-direction (giáp bạc, khiên thập tự đỏ, tabard trắng, kiếm dài, top-down nền trong). Xác minh bằng mắt.
- Chi phí: 1 generation/ảnh, ~16s/ảnh. CameraView: side|low top-down|high top-down. Direction: 8 hướng. Outline/Shading/Detail có enum.
- rotate: xoay sang hướng khác (tạo 4 facing từ 1 base). animate-with-text: N frame theo action+direction+reference_image.
- Repo có sẵn tools/lib/png.mjs (decode/encode/blit) + image-ops.mjs (scaleNearest/crop/composite) → ghép sheet không cần npm dep mới.
- Cảnh báo: full asset 5 chương = hàng trăm generations. Hết quota → dùng tạm (quyết định user), không dừng.

## PHÁT HIỆN gate 3 (2026-11-20 18:51) — hero animation PixelLab không đạt
- Single-sprite (quái/trùm/chân dung/tile) PixelLab: ĐẠT, chất lượng tốt (imp verified).
- Hero-sheet (base→rotate 4 hướng→animate walk/slash/cast): KHÔNG dùng được.
  - rotate hướng lên/trái: mất silhouette, chỉ còn khối áo choàng đỏ.
  - animate-with-text: frame giật, lệch scale, hướng lưng (up) bị áo choàng che → slash không đọc được.
- Hero LPC hiện có đã animate đẹp, battle-tested → thay bằng PixelLab sẽ REGRESS chất lượng (trái "chuẩn chỉ").
- Đã khôi phục hero sheet + credit về LPC; bỏ recipe hero PixelLab. imp recipe giữ lại.
- → Done means #1 (hero từ PixelLab) cần hỏi user: giữ LPC cho hero, hay thử animate-with-skeleton (tốn thêm generations, chưa chắc).

## Môi trường đã kiểm
- node v24.15.0, npm 11.12.1 (>= yêu cầu 22.13).
- origin = https://github.com/congvu99/HeroX.git (GitHub, KHÔNG Bitbucket).
- PixelLab API key (dán trong chat) đã xác minh: balance $0 nhưng endpoint generate-image-pixflux trả HTTP 200 + ảnh (có quota generations). Endpoints: pixflux, bitforge, rotate, animate-with-skeleton, animate-with-text, inpaint, estimate-skeleton.
- gh CLI: KHÔNG có trên PATH, không ở thư mục cài phổ biến.
