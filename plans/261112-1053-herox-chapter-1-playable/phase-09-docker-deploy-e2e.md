---
phase: 9
title: "Docker, tích hợp proxy, E2E nghiệm thu"
status: in-progress
priority: P1
effort: "2d"
dependencies: [8]
---

# Phase 09: Docker và nghiệm thu

## Goal
Image HeroX chạy cạnh `eng`, dùng chung Postgres, proxy route `/herox/`; E2E chứng minh 8 tiêu chí nghiệm thu chương 1. Agent không tự deploy lên server thật.

## Files to Create
- `Dockerfile` — multi-stage: build (`npm ci`, `npm run build`) → runtime `node:22-alpine`, `USER node`, chỉ copy `dist`, `HEALTHCHECK` gọi `/herox/api/health`.
- `compose.yml` — service `herox`, `env_file: .env`, `DATABASE_URL` trỏ host `db` của `eng`; mạng ngoài: mạng mặc định của project `lingobrain` (`lingobrain_default`) + `web`; `mem_limit: 256m`.
- `compose.dev.yml` — Postgres tạm + seed fixture + container HeroX, để E2E không cần `eng` thật.
- `docs/deployment-guide.md` — các bước: chạy script role (phase 02), tạo `.env`, `docker compose up -d`, thêm route proxy `/herox/` → `herox:3180` (giữ `X-Forwarded-For`, `TRUST_PROXY_HOPS=1`), kiểm tra, rollback (`docker compose down`, gỡ route; dữ liệu `herox` giữ nguyên).
- `e2e/*.spec.ts` — Playwright, 2 project: Desktop Chrome và iPhone 12 (WebKit):
  - đăng nhập bằng token test trong `localStorage['eng.auth.v1']` → thấy số từ đúng fixture;
  - đổi fixture (thêm từ đã học) → mở lại thấy mở khoá mới;
  - trận: gõ đúng, vòng từ, combo 3;
  - nâng cấp lò rèn, reload, còn nguyên;
  - chạy chương 1 rút gọn (dùng cờ test bỏ qua thoại) tới kết chương;
  - không có request ghi tới API của `eng`.

## Verification
- `docker compose -f compose.dev.yml up --build` → healthcheck healthy.
- `npx playwright test` pass cả 2 project; lưu trace, ảnh chụp vào `plans/reports/`.
- Kiểm DB: `SELECT` quyền của `herox_app` chỉ có SELECT trên `public.*` (người dùng tự chạy câu kiểm `has_table_privilege`).
- `verify-app` của repo: chưa có → chạy `/g1:verify-setup` sau phase này.

## Ngoài phạm vi agent
Deploy lên server thật, sửa proxy production: người vận hành làm theo `docs/deployment-guide.md`.

## Tiến độ (2026-11-12)

Làm phần không phụ thuộc phase 07/08. Chưa commit.

### Đã làm
- `Dockerfile`: target `runtime` (mặc định), `e2e-seed`, `web-e2e` (nginx + client bản dev, cấu hình `deploy/nginx-e2e.conf`). `.dockerignore` thêm `**/dist-e2e`, `prototypes`.
- `compose.yml`, `compose.dev.yml` (Postgres 17 tmpfs → `seed` → `herox` → `web` ở `127.0.0.1:8080`): `docker-compose config -q` hợp lệ.
- `docs/deployment-guide.md`; README thêm mục E2E; script `test:e2e`, `typecheck:e2e`; ESLint nhận `playwright.config.ts`.
- Khung Playwright: `playwright.config.ts` (2 project `desktop-chrome`, `iphone-12`; tự dựng PGlite 55432 + server 3180 + client build dev qua `vite preview` 5181; `E2E_BASE_URL` để chạy vào stack có sẵn). Fixture `e2e/fixtures/e2e-fixture.ts` (60 từ, 55 đã học, 12 thuộc lòng, mốc truyện tính từ dữ liệu chương), seed `e2e/support/seed-e2e-database.ts`.
- Spec bật: đăng nhập token test + số từ khớp fixture; không token thì không gọi API; trận gõ và vòng từ (combo 3, thắng, server chạy lại log); lò rèn nâng cấp → reload còn nguyên; không có request ghi ra ngoài `/herox/api/` (kiểm ở mọi spec qua fixture `requestLog`, thêm spec riêng chạy trận + thành trì).
- Kết quả: `npx playwright test` 12 pass, 2 skip (chương 1 × 2 project), trace/ảnh ở `plans/reports/e2e-playwright/`.

### Chờ
- **Compose healthy chưa kiểm được**: máy dev chỉ có Docker Windows container, không chạy được image Linux. Cần chạy `docker compose -f compose.dev.yml up --build -d --wait` trên máy có Docker Linux, rồi `E2E_BASE_URL=http://localhost:8080/herox/ npx playwright test`.
- **Server chưa phục vụ file tĩnh client**: image `runtime` có `client/dist` nhưng chưa có route; `compose.dev.yml` tạm dùng nginx `web`. Cần quyết định phục vụ tĩnh ở server hay ở proxy trước khi deploy.
- **Spec chương 1 tới kết chương**: `test.skip`, chờ phase 07 (nội dung chương 1) và cờ test bỏ qua thoại.
- **Spec "đổi fixture thêm từ đã học → mở khoá mới"**: chưa làm (ngoài phạm vi đợt này).
- Kiểm quyền `herox_app`: người dùng tự chạy câu `has_table_privilege` trong deployment guide.

### Hook test còn thiếu (không tự sửa src)
- Driver đọc trường nội bộ của scene qua `window.__HEROX_GAME__` (`hero.body`, `levelRef`, `transitioning`, `session`, `ring.slots`). Nên có API test ổn định (ví dụ `window.__HEROX_TEST__`) để đổi tên trường trong scene không làm vỡ E2E.
- Chưa có cờ bỏ qua thoại cho spec chương 1.
