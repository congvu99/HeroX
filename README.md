# HeroX

Game nhập vai học từ chạy trên web. Người dùng LingoBrain mở `/herox/` (cùng domain với LingoBrain), vào game bằng phiên đăng nhập sẵn có; cấp nhân vật, chiêu và vùng mở khoá khớp số từ đã học / đã thuộc. Chiến đấu bằng cách gõ từ (bàn phím) hoặc vòng từ (cảm ứng).

Kế hoạch: [`plans/261112-1053-herox-chapter-1-playable/plan.md`](plans/261112-1053-herox-chapter-1-playable/plan.md). Kiến trúc: [`docs/system-architecture.md`](docs/system-architecture.md).

## Cấu trúc

| Gói | Vai trò |
|---|---|
| `client/` (`@herox/client`) | Game Phaser + TypeScript, build bằng Vite với `base: '/herox/'` |
| `server/` (`@herox/server`) | API Fastify dưới `/herox/api/*`, sau này phục vụ cả file tĩnh |
| `shared/` (`@herox/shared`) | Kiểu dữ liệu và logic thuần dùng chung (đường dẫn API, công thức cấp, logic trận) |

Phiên bản khoá chính xác trong `package.json`: Phaser **4.2.1**, Fastify 5.12.8, Vite 8.3.8, TypeScript 6.0.3 (typescript-eslint 8.72 chưa hỗ trợ TS 7), Vitest 5.1.0.

## Yêu cầu

- Node.js `>= 22.13` (Docker dùng `node:22`).
- Postgres của LingoBrain (từ phase 02; khung hiện tại chưa kết nối DB).

## Chạy dev

```bash
npm install
cp .env.example .env   # sửa giá trị thật; không commit file .env
npm run dev
```

`npm run dev` chạy song song hai process trên **cổng cố định**:

| Process | Cổng | Ghi chú |
|---|---|---|
| Vite (client) | 5180 | Mở `http://localhost:5180/herox/`. Vite lắng nghe `localhost` (trên Windows có thể chỉ là `::1`) |
| Server (tsx watch) | 3180 | Vite proxy `/herox/api/*` sang `http://127.0.0.1:3180` |

Cả hai dùng `strictPort`: nếu cổng bận, dừng process cũ chứ không đổi cổng. Kiểm tra trên Windows bằng `netstat -ano | findstr ":5180 :3180"` rồi `taskkill /PID <pid>`; trên macOS/Linux dùng `lsof -i :5180`.

Biến môi trường (xem `.env.example`): `DATABASE_URL`, `PORT`, `TRUST_PROXY_HOPS`, `PGSSL`.

## Kiểm tra

```bash
npm run typecheck   # tsc --noEmit cho cả 3 gói, strict
npm run lint        # ESLint + typescript-eslint (type-checked)
npm test            # Vitest cho shared và server
npm run build       # shared → server → client
```

Playwright (`@playwright/test`) đã cài, spec E2E viết ở phase 09. Cài trình duyệt khi cần: `npx playwright install chromium`.

## Chạy bản build

```bash
npm run build
npm start -w @herox/server   # node dist/server.js, cổng theo PORT (mặc định 3180)
```

Health check: `GET /herox/api/health` → `{"status":"ok"}`.
