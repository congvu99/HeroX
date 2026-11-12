# Hướng dẫn triển khai HeroX

Tài liệu cho người vận hành. Agent không deploy, không sửa proxy production; mọi bước dưới đây do người vận hành chạy.

HeroX chạy thành container `herox` cạnh LingoBrain (project compose `lingobrain`), dùng chung Postgres `db` của LingoBrain qua role `herox_app`, nhận request qua reverse proxy của LingoBrain ở đường dẫn `/herox/`. Kiến trúc: [`system-architecture.md`](system-architecture.md).

## Chưa sẵn sàng

- **Server chưa phục vụ file tĩnh.** Image có sẵn bản build client ở `/app/client/dist` nhưng server hiện chỉ có route `/herox/api/*`. Trước khi có route file tĩnh trong server, proxy chỉ chuyển được API; trang `/herox/` sẽ 404. Không deploy cho người dùng tới khi phần này xong.
- Nội dung chương 1 và PWA chưa xong; E2E "chương 1 tới kết chương" đang tạm bỏ qua.

## File

| File | Vai trò |
|---|---|
| [`Dockerfile`](../Dockerfile) | Target mặc định `runtime`: `node:22-alpine`, `USER node`, chỉ `dist` + dependency production của server, `HEALTHCHECK` gọi `/herox/api/health`. Target `e2e-seed`, `web-e2e` chỉ dùng cho môi trường thử |
| [`compose.yml`](../compose.yml) | Service `herox` cho production: `env_file: .env`, mạng ngoài `lingobrain_default` (thấy host `db`) và `web` (mạng của proxy), `mem_limit: 256m`, `TRUST_PROXY_HOPS=1` |
| [`compose.dev.yml`](../compose.dev.yml) | Môi trường thử E2E, không cần LingoBrain thật (xem [Môi trường thử](#môi-trường-thử-e2e)) |

## Triển khai lần đầu

1. **Tạo role `herox_app`** bằng script cấp quyền (soạn ở bước cầu nối dữ liệu, lưu ngoài repo: `D:\DB-Backup\HeroX\2026\20261112\herox.role_herox_app_113800_after.sql`; rollback ở file `_before.sql` cùng thư mục). Chạy bằng tài khoản owner của DB LingoBrain:

   ```bash
   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -v herox_app_password='<mật khẩu mạnh>' \
        -f herox.role_herox_app_113800_after.sql
   ```

   Script cấp `SELECT` theo cột trên `public.users/sessions/progress/words/deck_meta` (không có `users.pass_hash`) và tạo schema `herox` thuộc `herox_app`. Server tự tạo bảng trong `herox` lúc khởi động.

2. **Tạo `.env`** cạnh `compose.yml` từ [`.env.example`](../.env.example), không commit:

   ```bash
   DATABASE_URL=postgres://herox_app:<mật khẩu>@db:5432/<db của LingoBrain>
   PGSSL=false
   ```

   `PORT` và `TRUST_PROXY_HOPS` đã đặt trong `compose.yml`.

3. **Kiểm mạng ngoài** đã có: `docker network ls` phải thấy `lingobrain_default` (mạng mặc định của project `lingobrain`) và `web` (mạng của proxy). Tên khác thì sửa khối `networks` trong `compose.yml`.

4. **Chạy**:

   ```bash
   docker compose up -d --build
   docker compose ps          # herox phải "healthy"
   ```

5. **Thêm route proxy** `/herox/` → `http://herox:3180`, giữ nguyên đường dẫn (không cắt tiền tố `/herox`), chuyển header `X-Forwarded-For` (một proxy đứng trước, khớp `TRUST_PROXY_HOPS=1`). Ví dụ nginx:

   ```nginx
   location /herox/ {
     proxy_pass http://herox:3180;
     proxy_set_header Host $host;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

   Reload proxy theo cách đang dùng cho LingoBrain.

## Kiểm tra sau triển khai

```bash
curl -fsS https://<domain>/herox/api/health   # {"status":"ok"}
curl -fsS https://<domain>/herox/api/ready    # {"status":"ready"} khi migration xong
docker compose logs --tail=100 herox          # không có lỗi kết nối DB, không có token trong log
```

Kiểm quyền của `herox_app` (chạy bằng tài khoản admin, chỉ đọc):

```sql
SELECT table_name,
       has_table_privilege('herox_app', 'public.' || table_name, 'INSERT') AS can_insert,
       has_table_privilege('herox_app', 'public.' || table_name, 'UPDATE') AS can_update,
       has_table_privilege('herox_app', 'public.' || table_name, 'DELETE') AS can_delete
FROM information_schema.tables
WHERE table_schema = 'public';
```

Mọi cột `can_*` phải là `false`. Quyền đọc theo cột xem ở câu kiểm cuối script role.

## Cập nhật phiên bản

```bash
git pull
docker compose up -d --build
docker compose ps
```

Migration mới chạy tự động khi container khởi động (khoá advisory, chạy lại an toàn); trong lúc chạy, `/herox/api/ready` trả 503.

## Rollback

1. Gỡ route `/herox/` khỏi proxy, reload proxy.
2. `docker compose down` (không thêm `-v`: HeroX không có volume, dữ liệu nằm ở schema `herox` trong Postgres của LingoBrain và được giữ nguyên).
3. Quay lại bản trước: checkout commit cũ rồi `docker compose up -d --build`. Migration chỉ thêm bảng/cột nên bản cũ vẫn chạy trên schema mới.
4. Gỡ hẳn HeroX (mất dữ liệu game): chạy file `_before.sql` của script role. Chỉ làm khi đã có quyết định xoá dữ liệu.

## Môi trường thử E2E

`compose.dev.yml` dựng: Postgres 17 tạm (dữ liệu trong RAM, tên DB `lingobrain_e2e`), service `seed` (tạo bảng LingoBrain tối giản, chạy migration `herox`, nạp fixture `e2e/fixtures/e2e-fixture.ts`; từ chối DB có tên không chứa `e2e`), `herox` (image `runtime`), `web` (nginx đóng vai proxy `/herox/`, phục vụ client bản dev có hook kiểm thử) ở `http://localhost:8080/herox/`.

```bash
docker compose -f compose.dev.yml up --build -d --wait
E2E_BASE_URL=http://localhost:8080/herox/ npx playwright test
docker compose -f compose.dev.yml run --rm seed    # nạp lại fixture trước khi chạy E2E lần nữa
docker compose -f compose.dev.yml down
```

Cần Docker chạy Linux container. Môi trường thử dùng tài khoản `postgres` của DB tạm, không mô phỏng quyền `herox_app`; quyền kiểm bằng câu SQL ở phần trên.

Không có Docker: `npx playwright test` tự dựng Postgres nhúng (PGlite, cổng 55432), server (3180) và client bản build dev qua `vite preview` (5181); xem phần E2E trong [`README.md`](../README.md#e2e).
