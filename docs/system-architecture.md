# Kiến trúc hệ thống HeroX

HeroX chạy cùng origin với LingoBrain (repo `eng`), dưới đường dẫn `/herox/`. Client là game Phaser; server Node đọc tiến độ học từ Postgres của LingoBrain và lưu dữ liệu riêng của game ở schema `herox`.

```
Trình duyệt (cùng origin với eng)
  /herox/            Phaser + TS (Vite build, base '/herox/'), SW riêng scope /herox/
     đọc localStorage 'eng.auth.v1'.token  ──Bearer──►  /herox/api/*
                                                          │
Container herox (Node 22, TS)                             ▼
  static /herox/*  +  API  ── role herox_app ──►  Postgres của eng
                                 SELECT public.users/sessions/progress/words
                                 ALL    schema herox (hero, citadel, inventory, story, word_misses)
```

## Thành phần

| Thành phần | Mã nguồn | Trách nhiệm |
|---|---|---|
| Client | `client/src` | Scene Phaser, input bàn phím / cảm ứng, gọi API. Độ phân giải logic 640x360, pixel art, co giãn `FIT` |
| Server | `server/src` | `buildApp` (route, cấu hình Fastify) tách khỏi `server.ts` (listen, tắt mềm) để test bằng `inject` |
| Shared | `shared/src` | Hằng số đường dẫn (`APP_BASE_PATH`, `API_PREFIX`, `apiPath`) và logic thuần dùng ở cả hai phía |

`@herox/shared` export điều kiện `source` trỏ vào mã TS: Vite, Vitest, `tsx` và `tsc --noEmit` đọc thẳng mã nguồn; bản build server dùng `shared/dist` (build trước theo thứ tự trong `npm run build`).

## Ranh giới dữ liệu

- HeroX chỉ `SELECT` trên `public.users`, `public.sessions`, `public.progress`, `public.words`; mọi lệnh ghi nằm ở schema `herox`.
- Không ghi ngược SRS của LingoBrain; từ trả lời sai lưu ở `herox.word_misses`.
- Xác thực: token phiên của LingoBrain trong `localStorage['eng.auth.v1']`, gửi dạng `Authorization: Bearer`; server băm SHA-256 rồi tra `public.sessions` (phase 02).

## Mạng và proxy

- Dev: Vite 5180 proxy `/herox/api` sang server 3180.
- Production: reverse proxy của LingoBrain chuyển `/herox/*` vào container HeroX; đặt `TRUST_PROXY_HOPS=1` để Fastify lấy đúng IP client từ `X-Forwarded-For`.
