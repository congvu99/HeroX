---
phase: 9
title: "Docker, tích hợp proxy, E2E nghiệm thu"
status: pending
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
