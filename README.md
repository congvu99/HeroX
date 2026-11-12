# HeroX

Game nhập vai học từ chạy trên web. Người dùng LingoBrain mở `/herox/` (cùng domain với LingoBrain), vào game bằng phiên đăng nhập sẵn có; cấp nhân vật, chiêu và vùng mở khoá khớp số từ đã học / đã thuộc. Chiến đấu bằng cách gõ từ (bàn phím) hoặc vòng từ (cảm ứng).

Kế hoạch: [`plans/261112-1053-herox-chapter-1-playable/plan.md`](plans/261112-1053-herox-chapter-1-playable/plan.md). Kiến trúc: [`docs/system-architecture.md`](docs/system-architecture.md).

## Cấu trúc

| Gói | Vai trò |
|---|---|
| `client/` (`@herox/client`) | Game Phaser + TypeScript, build bằng Vite với `base: '/herox/'` |
| `server/` (`@herox/server`) | API Fastify dưới `/herox/api/*`, sau này phục vụ cả file tĩnh |
| `shared/` (`@herox/shared`) | Kiểu dữ liệu và logic thuần dùng chung (đường dẫn API, công thức cấp, logic trận) |
| `assets/` | Map LDtk (`maps/`), tileset (`tilesets/`); client nạp qua `import.meta.glob`, URL có hash |

Map soạn bằng **LDtk 1.5.3** (bản mới nhất, kiểm 2026-11-12), bật "Save levels to separate files"; loader chấp nhận mọi `jsonVersion` 1.x và báo lỗi rõ khi khác major. Phiên bản khoá chính xác trong `package.json`: Phaser **4.2.1**, Fastify 5.12.8, Vite 8.3.8, TypeScript 6.0.3 (typescript-eslint 8.72 chưa hỗ trợ TS 7), Vitest 5.1.0.

## Yêu cầu

- Node.js `>= 22.13` (Docker dùng `node:22`).
- Postgres của LingoBrain và role `herox_app` (script cấp quyền do người vận hành chạy; server tự tạo bảng trong schema `herox` lúc khởi động).

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

Chạy dev không có phiên LingoBrain (cổng 5180 khác origin của LingoBrain): màn đăng nhập có thêm nút "Vào map thử (dev)"; nút này và biến `window.__HEROX_GAME__` (cho script kiểm thử) chỉ có ở dev, bị loại khỏi bản build.

Cả hai dùng `strictPort`: nếu cổng bận, dừng process cũ chứ không đổi cổng. Kiểm tra trên Windows bằng `netstat -ano | findstr ":5180 :3180"` rồi `taskkill /PID <pid>`; trên macOS/Linux dùng `lsof -i :5180`.

Biến môi trường (xem `.env.example`): `DATABASE_URL` (bắt buộc), `PORT`, `TRUST_PROXY_HOPS`, `PGSSL`, `PGSSLROOTCERT`.

## Kiểm tra

```bash
npm run typecheck   # tsc --noEmit cho cả 3 gói, strict
npm run lint        # ESLint + typescript-eslint (type-checked)
npm test            # Vitest cho shared, server và client (client chỉ test logic thuần, không cần trình duyệt); test SQL chạy trên Postgres nhúng (PGlite), không cần Docker
                    # test hợp đồng với LingoBrain chạy khi có repo ../eng (hoặc ENG_REPO_DIR)
npm run test:coverage  # như npm test, kèm báo cáo phủ; logic trận shared/src/combat phải phủ ≥ 90% dòng
npm run build       # shared → server → client
```

Map thử `assets/maps/test-room.ldtk` (3 level nối bằng cổng: `Test_Room_A`, `Test_Room_B`, thành trì tạm `Lexhold` ở cổng trái của `Test_Room_A`) và tileset placeholder sinh lại bằng `npm run generate:test-room -w @herox/client`.

Hiệu ứng chiêu render sẵn từ [pixelfx](https://github.com/patch-gg/pixelfx) (devDependency, khoá commit) theo `assets/fx/fx-manifest.json`. Sau khi đổi manifest chạy `node tools/render-fx.mjs` (hoặc `node tools/render-fx.mjs <tên> ...` cho vài effect), commit cả `client/public/fx/` và cập nhật `assets/fx/CREDITS.md` (test so khớp sẽ báo nếu thiếu).

Điều khiển: WASD/mũi tên đi, Space lướt, E thuấn bộ (cần đủ trạng từ + giới từ đã học; dev không đăng nhập thì mở sẵn). Trong trận gõ từ rồi Enter, hoặc chạm vòng từ; đổi kiểu nhập và bật/tắt âm thanh bằng nút ở góc màn trận (lưu ở `localStorage`). Dev không đăng nhập: trận dùng bộ 20 từ thử, không gửi kết quả. Ở Lexhold, bước tới cạnh dưới một công trình để mở bảng nâng cấp; Escape hoặc nút "Đóng" để quay lại. Dev không đăng nhập: thành trì chạy cục bộ với số liệu thử, mất khi tải lại trang.

Vite dev đang chạy mà vừa sinh lại map có level mới: chạm lại `client/src/maps/map-asset-urls.ts` (hoặc khởi động lại Vite) để bảng asset nhận file `.ldtkl` mới.

## E2E

Playwright, 2 project: `desktop-chrome` và `iphone-12` (WebKit). Cài trình duyệt lần đầu: `npx playwright install chromium webkit`.

```bash
npm run test:e2e        # = npx playwright test; tự dựng môi trường riêng rồi tắt khi xong
npm run typecheck:e2e   # tsc cho e2e/ và playwright.config.ts
```

Môi trường tự dựng (cổng cố định, cổng bận thì dừng process cũ chứ không đổi cổng; không bao giờ dùng lại server đang chạy):

| Thành phần | Cổng | Ghi chú |
|---|---|---|
| Postgres nhúng (PGlite) | 55432 | Seed fixture `e2e/fixtures/e2e-fixture.ts`: 60 từ, mỗi project 5 người dùng riêng (55 từ đã học, 12 thuộc lòng), nhân vật, mốc truyện đủ mở trận `ch1-field` và lò rèn |
| Server | 3180 | Chạy mã nguồn, không đọc `.env` (tránh trỏ vào DB thật). Trùng cổng dev: tắt `npm run dev` trước khi chạy E2E |
| Client | 5181 | Build chế độ dev (giữ hook `window.__HEROX_GAME__`) ra `client/dist-e2e`, phục vụ bằng `vite preview` |

Chạy vào stack có sẵn (ví dụ `compose.dev.yml`): `E2E_BASE_URL=http://localhost:8080/herox/ npx playwright test`, xem [`docs/deployment-guide.md`](docs/deployment-guide.md#môi-trường-thử-e2e).

Kết quả (trace, ảnh, báo cáo HTML) ở `plans/reports/e2e-playwright/`; xem trace: `npx playwright show-trace <đường dẫn trace.zip>`. Mọi spec kiểm không có request ghi (POST/PUT/PATCH/DELETE) nào ra ngoài `/herox/api/`.

## Chạy bản build

```bash
npm run build
npm start -w @herox/server   # node dist/server.js, cổng theo PORT (mặc định 3180)
```

Health check: `GET /herox/api/health` → `{"status":"ok"}`. Các route API khác: xem [`docs/system-architecture.md`](docs/system-architecture.md#api).
