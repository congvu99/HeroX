---
phase: 1
title: "Khung dự án, công cụ, CI cục bộ"
status: completed
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 01: Khung dự án

## Goal
Repo HeroX build được client (Vite + Phaser + TS) và server (Node 22 + TS), có test, lint, typecheck chạy một lệnh.

## Files to Create
- `D:\project\HeroX\package.json` — workspace npm: `client`, `server`, `shared`; scripts `dev`, `build`, `test`, `lint`, `typecheck`.
- `D:\project\HeroX\tsconfig.base.json`, `eslint.config.js`, `.editorconfig`, `.gitignore`, `.dockerignore`, `.env.example` (không chứa bí mật thật).
- `client/` — `vite.config.ts` (`base: '/herox/'`, `build.assetsInlineLimit` nhỏ, tên file có hash), `index.html`, `src/main.ts` (khởi tạo Phaser, màn hình trống "HeroX").
- `server/` — `src/server.ts` (HTTP thuần hoặc Fastify; chọn Fastify nếu cần schema validation gọn), `src/config.ts` (đọc env: `DATABASE_URL`, `PORT`, `TRUST_PROXY_HOPS`, `PGSSL`).
- `shared/` — kiểu dữ liệu và logic thuần dùng chung client/server (công thức cấp, bảng mốc, logic trận).
- `README.md` — mục tiêu, cách chạy dev, cách test.
- `docs/system-architecture.md` — sơ đồ như `plan.md` mục Kiến trúc.

## Tasks
1. Khởi tạo npm workspaces; Node `>=22`; khoá phiên bản Phaser (bản ổn định mới nhất tại thời điểm làm, ghi vào README).
2. Vitest cho `shared` và `server`; Playwright cài sẵn nhưng spec để phase 09.
3. ESLint + `tsc --noEmit` cho cả 3 gói, `strict: true`.
4. `npm run dev` chạy song song Vite (cổng 5180) và server (cổng 3180), Vite proxy `/herox/api` sang server. Cổng cố định, ghi README (theo rule quản lý process).
5. Commit đầu theo conventional commit, không ghi công AI.

## Verification
- `npm install && npm run typecheck && npm run lint && npm test && npm run build` thoát mã 0.
- Mở `http://localhost:5180/herox/` thấy canvas Phaser.

## Risks
- Phaser major mới đổi API: khoá phiên bản chính xác trong `package.json`.

## Kết quả (2026-11-12)
- Khoá: Phaser 4.2.1, Fastify 5.12.8, Vite 8.3.8, Vitest 5.1.0, TypeScript **6.0.3** (typescript-eslint 8.72.2 chỉ hỗ trợ TS < 6.1, nên không lên TS 7).
- `@herox/shared` export điều kiện `source` → `src/index.ts` cho Vite/Vitest/tsx/typecheck; build server dùng `shared/dist`, nên `npm run build` chạy shared → server → client. Docker (phase 09) phải copy `shared/dist`.
- `trustProxy` của Fastify 5 không nhận số trong type: dùng hàm `hop < TRUST_PROXY_HOPS` (có test).
- Phaser tách chunk `phaser-*.js` riêng; `chunkSizeWarningLimit` 1500 kB.
- `DATABASE_URL` hiện tuỳ chọn; phase 02 chuyển thành bắt buộc khi nối DB.
- `npm audit`: 10 lỗ hổng moderate (`minimatch` ReDoS) chỉ trong chuỗi ESLint/typescript-eslint (devDependency), chưa có bản vá không phá vỡ.
- Kiểm: typecheck, lint, test (12 test), build đều mã 0; dev mở `http://localhost:5180/herox/` thấy canvas 640x360 chữ "HeroX"; proxy `/herox/api/health` → 200.
