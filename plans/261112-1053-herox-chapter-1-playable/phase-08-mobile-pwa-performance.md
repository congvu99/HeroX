---
phase: 8
title: "iPhone, PWA, hiệu năng"
status: pending
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
2. Ngân sách: tải lần đầu ≤ 5 MB (gzip), JS ≤ 1.5 MB; atlas nạp theo map.
3. Đo trên iPhone thật (người dùng cung cấp): fps, bộ nhớ, thời gian tải; ghi số liệu vào báo cáo phase.

## Verification
- Lighthouse PWA cho `/herox/`: installable, SW đúng scope.
- iPhone thật: chơi 1 trận + đi lại map 5 phút, ≥ 30 fps, không crash, bàn phím ảo không che đề.
- Sau khi đã mở `eng` trước (SW `eng` đã cài), mở `/herox/` vẫn thấy bản mới nhất sau deploy.
