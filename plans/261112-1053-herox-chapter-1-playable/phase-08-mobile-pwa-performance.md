---
phase: 8
title: "iPhone, PWA, hiệu năng"
status: in-progress
priority: P1
effort: "2d"
dependencies: [7]
---

# Phase 08: iPhone, PWA, hiệu năng

## Goal
Chơi mượt trên iPhone 12+ (Safari và PWA), cài được lên màn hình chính, không xung đột với service worker của `eng`.

## Bằng chứng xung đột SW
`eng/sw.js` có scope `/`, chặn mọi GET cùng origin trừ `/api/*`: cache-first, `ignoreSearch`, lỗi mạng trả `index.html` của `eng` (`eng/sw.js:237-281`). Không xử lý thì trang và API GET của `/herox/` có thể bị trả bản cũ hoặc trang của `eng`.

## Files to Create
- `client/public/sw.js` (phục vụ ở `/herox/sw.js`, scope `/herox/`) — `skipWaiting` + `clients.claim()`; precache asset có hash; `/herox/api/*` luôn đi mạng; offline → trang "Cần mạng để chơi" của HeroX.
- `client/public/manifest.webmanifest` — `start_url` và `scope` = `/herox/`, `display: fullscreen`, `orientation: landscape`, icon riêng.
- `client/src/platform/ios-viewport.ts` — `visualViewport` để neo ô gõ trên bàn phím ảo, chặn zoom khi chạm đúp, xử lý xoay màn hình, mở khoá âm thanh sau chạm đầu.
- `client/src/platform/quality-settings.ts` — tự giảm hạt/hiệu ứng nền khi fps < 30 trong 3 giây; tôn trọng `prefers-reduced-motion`.

## Tasks
1. Theo Q1 đã duyệt: ở repo `D:\project\eng`, tạo nhánh riêng, thêm vào `sw.js` (ngay sau kiểm `url.origin`) `if (url.pathname.startsWith('/herox/')) return;` kèm comment lý do; tăng `CACHE` trong `sw.js` và `APP_VERSION` trong `js/app-storage.js` cho khớp (test `pwa-assets` của `eng` bắt buộc); chạy `node tests/run-tests.js`; mở PR, không tự merge. HeroX vẫn có SW riêng scope `/herox/` cho offline/precache.
2. Ngân sách: tải lần đầu ≤ 5 MB (gzip), JS ≤ 1.5 MB; atlas nạp theo map. Sprite PixelLab (khung 64, 4 hướng, trùm 128) đóng atlas ≤ 2048; đo tổng bộ nhớ GPU khi có đủ asset chương 1. Lớp bóng tối và mưa (`docs/art-direction.md`) nằm trong mức giảm chất lượng tự động khi fps < 30.
3. Đo trên iPhone thật (người dùng cung cấp): fps, bộ nhớ, thời gian tải; ghi số liệu vào báo cáo phase.

## Verification
- Lighthouse PWA cho `/herox/`: installable, SW đúng scope.
- iPhone thật: chơi 1 trận + đi lại map 5 phút, ≥ 30 fps, không crash, bàn phím ảo không che đề.
- Sau khi đã mở `eng` trước (SW `eng` đã cài), mở `/herox/` vẫn thấy bản mới nhất sau deploy.

## Tiến độ (2026-11-12)

### Đã làm (không phụ thuộc phase 07)
- **Task 1 — PR `eng`:** https://github.com/congvu99/LingoBrain/pull/1 (nhánh `fix/sw-bypass-herox-path` từ `main`, commit `dccb8a2`). `sw.js` thêm `if (url.pathname.startsWith('/herox/')) return;` sau kiểm `url.origin`, kèm comment; `CACHE` và `APP_VERSION` lên `2.26.2`. `node tests/run-tests.js`: 817 passed, 0 failed. Chưa merge; chờ chủ repo duyệt.
- `client/public/sw.js`: scope suy từ vị trí file (`/herox/`). `/herox/api/*` không chặn (đi mạng). `assets/*` (hash) cache-first; lúc cài đọc `index.html` để precache file hash nó tham chiếu; chỉ dọn file hash cũ khi index tham chiếu file mới (bản deploy mới), để map/atlas nạp động không bị xoá mỗi lần mở trang. Trang: network-first, mất mạng → trang đã cache, chưa có → trang "Cần mạng để chơi" (503). File tĩnh khác: network-first. Đổi logic SW thì tăng `SW_VERSION`.
- `client/public/manifest.webmanifest`: `id`/`start_url`/`scope` = `/herox/`, `fullscreen`, `landscape`, màu nền `#0b0b12`, khai báo icon 192/512/maskable 512.
- `client/src/platform/ios-viewport.ts`: `attachIosViewport(root, { onKeyboardInsetChange, onOrientationChange, onFirstInteraction })` ghi `--keyboard-inset` lên `root`, chặn chạm đúp và `gesturestart` (bỏ qua ô nhập), báo xoay máy, gọi mở khoá âm thanh ở thao tác đầu. Hàm thuần: `computeKeyboardInset`, `resolveOrientation`, `isDoubleTap`.
- `client/src/platform/quality-settings.ts`: `LowFrameRateDetector` (fps < 30 liên tục 3 s, bỏ chuỗi khi hai mẫu cách > 1 s), `QualityController` (chỉ tự hạ `high → low`, không tự nâng), `resolveQualityProfile` (mức thấp tắt mưa/tàn lửa và lớp bóng tối, hạt × 0.35; `prefers-reduced-motion` tắt rung màn và mưa), `watchReducedMotion`.
- Test: `client/test/pwa-files.test.ts` (chạy `sw.js` trong sandbox `vm`, kiểm phân loại request và trích asset; kiểm manifest), `client/test/ios-viewport.test.ts`, `client/test/quality-settings.test.ts`.
- Kiểm tra: `npm test` 47 file / 494 test đạt; `npm run typecheck`, `npm run lint`, `npm run build` đạt; `client/dist` có `sw.js` và `manifest.webmanifest`.

### Đã gắn vào game (2026-11-12, người dùng cho làm khi phase 07 còn dở)
- `client/index.html`: link manifest (bản build ra `/herox/manifest.webmanifest`), meta PWA iOS; `#game-root` trừ `--keyboard-inset` ở đáy để khung game co lên trên bàn phím ảo; nhắc "Xoay ngang màn hình" bằng CSS khi màn dọc và chạm là chính (không chặn thao tác).
- `client/src/main.ts`: `attachIosViewport(container)`; tạo `QualityController` đặt vào `registry` (`REGISTRY_KEYS.quality`), lấy mẫu `game.loop.actualFps` ở `POST_STEP`, theo dõi `prefers-reduced-motion`; đăng ký SW `${BASE_URL}sw.js` scope `BASE_URL` chỉ khi `import.meta.env.PROD`.
- `world-scene.ts`: lớp bóng tối theo `dynamicLightingEnabled`; tụt fps giữa chừng thì `DarkAtmosphere.disable()` (ẩn lớp tối, gỡ vignette). `battle-scene.ts`: bỏ rung màn khi `screenShakeEnabled` tắt.
- Đổi so với bản đầu: `ios-viewport.ts` bỏ phần xoay máy (CSS làm) và mở khoá âm thanh (`battle-scene` đã tự mở ở chạm/phím đầu); bộ đo fps bỏ qua 5 giây đầu (`FRAME_RATE_WARMUP_MS`) để lúc nạp asset không bị hạ chất lượng oan.
- Kiểm tra: `npm test` 55 file / 554 test đạt (lần đầu `server/src/app.test.ts` health check lỗi một lần, chạy lại riêng 2 lần và cả bộ đều đạt: chập chờn khi tải nặng, không do thay đổi này); typecheck, build đạt; `eslint client` đạt. `npm run lint` toàn repo lỗi 1 chỗ ở `prototypes/gothic-ui-demo/demo.test.mjs` (`URL` no-undef, file phiên khác sửa lúc 17:17), ngoài phạm vi phase này.

### Việc còn lại
1. Icon HeroX thật (`client/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) và `apple-touch-icon` (thêm link vào `index.html` khi có file): manifest đã khai báo nhưng file chưa có; thiếu thì Lighthouse báo không cài được.
2. `particleDensity`, `ambientWeatherEnabled` chưa có nơi dùng: game chưa có emitter hạt hay mưa. Khi phase 07 thêm mưa/tàn lửa thì đọc `QualityController` từ `registry` như `world-scene.ts`.
3. Task 2 — ngân sách: đo tải lần đầu và JS khi có đủ asset chương 1; atlas PixelLab ≤ 2048, nạp theo map; đo bộ nhớ GPU. Số hiện tại: JS gzip ≈ 412 KB (`phaser` 357 KB + `index` 54 KB).
4. Task 3 — đo iPhone thật: fps, bộ nhớ, thời gian tải; chơi 1 trận + đi map 5 phút; xác nhận bàn phím ảo không che đề (khung co theo `--keyboard-inset`) và chạm đúp không phóng to.
5. Verification: Lighthouse PWA `/herox/` sau khi có icon; kiểm "mở `eng` trước rồi mở `/herox/` vẫn thấy bản mới" sau khi PR eng #1 được merge và deploy.
