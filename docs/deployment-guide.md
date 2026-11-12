# Hướng dẫn triển khai HeroX (tự kiểm)

Tài liệu cho người vận hành tự làm và tự đánh dấu từng bước. Agent không deploy, không sửa proxy production.

Mỗi bước có **lệnh** và **kết quả đúng**. Kết quả khác thì dừng lại, xem mục [Sự cố thường gặp](#sự-cố-thường-gặp), chưa làm bước sau.

HeroX chạy thành container `herox` cạnh LingoBrain (project compose `lingobrain`), dùng chung Postgres `db` của LingoBrain qua role `herox_app` (chỉ đọc bảng LingoBrain, ghi trong schema `herox`), nhận request qua reverse proxy của LingoBrain ở đường dẫn `/herox/`. Kiến trúc: [`system-architecture.md`](system-architecture.md).

## 0. Đọc trước: chỗ còn thiếu

- **Server chưa phục vụ file tĩnh của client.** Image có bản build client ở `/app/client/dist`, nhưng server chỉ có route `/herox/api/*`. Nếu proxy chuyển cả `/herox/` vào container, trang game sẽ 404. Có 2 cách:
  - **Cách A (chờ):** đợi có route file tĩnh trong server, rồi proxy chỉ cần 1 route `/herox/` → `herox:3180`.
  - **Cách B (làm được ngay):** proxy LingoBrain tự phục vụ file tĩnh lấy từ image (bước [B5](#b5-thêm-route-proxy)). Cách này giống môi trường thử `compose.dev.yml`.
- Chương 1 (phase 07) và PWA (phase 08) chưa đóng. Deploy lúc này chỉ nên để chơi thử nội bộ.
- Image và `compose.dev.yml` **chưa từng được build/chạy**: máy dev hiện chỉ có Docker Windows container. Phần A là lần chạy đầu tiên, có thể lộ lỗi Dockerfile.

## Bảng file

| File | Vai trò |
|---|---|
| [`Dockerfile`](../Dockerfile) | Target mặc định `runtime`: `node:22-alpine`, `USER node`, chỉ `dist` + dependency production của server, `HEALTHCHECK` gọi `/herox/api/health`. Target `e2e-seed`, `web-e2e` chỉ dùng cho môi trường thử |
| [`compose.yml`](../compose.yml) | Production: service `herox`, `env_file: .env`, mạng ngoài `lingobrain_default` (thấy host `db`) và `web` (mạng của proxy), `mem_limit: 256m`, `TRUST_PROXY_HOPS=1` |
| [`compose.dev.yml`](../compose.dev.yml) | Môi trường thử: Postgres tạm + seed fixture + `herox` + nginx, không cần LingoBrain thật |
| [`deploy/nginx-e2e.conf`](../deploy/nginx-e2e.conf) | Cấu hình nginx của môi trường thử; mẫu cho route proxy cách B |
| `D:\DB-Backup\HeroX\2026\20261112\herox.role_herox_app_113800_after.sql` | Script tạo role `herox_app` (ngoài repo). Rollback: file `_before.sql` cùng thư mục |

---

## Phần A. Thử trên máy có Docker Linux (nên làm trước)

Kiểm image và luồng game end-to-end mà không chạm DB thật. Cần Docker chạy **Linux container** (Docker Desktop chế độ Linux, hoặc máy Linux).

### A1. Dựng môi trường thử

```bash
docker compose -f compose.dev.yml up --build -d --wait
docker compose -f compose.dev.yml ps -a
```

- [ ] Lệnh `up` kết thúc không lỗi (cờ `--wait` chờ mọi service healthy).
- [ ] `db`, `herox`, `web`: `healthy`. `seed`: `exited (0)`.

### A2. Kiểm API qua nginx

```bash
curl -fsS http://localhost:8080/herox/api/health   # → {"status":"ok"}
curl -fsS http://localhost:8080/herox/api/ready    # → {"status":"ready"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/herox/api/me   # → 401 (không có token)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/herox/          # → 200 (trang game)
```

- [ ] Đủ 4 kết quả như trên.

### A3. Chạy E2E vào stack này

```bash
npx playwright install chromium webkit      # lần đầu
E2E_BASE_URL=http://localhost:8080/herox/ npx playwright test
```

- [ ] Các spec đã bật đều pass (spec chương 1 đang viết, có thể chưa ổn định, xem phase 09).
- [ ] Báo cáo ở `plans/reports/e2e-playwright/html/index.html`.

Chạy E2E lần nữa thì nạp lại fixture trước: `docker compose -f compose.dev.yml run --rm seed`.

### A4. Dọn

```bash
docker compose -f compose.dev.yml down     # DB tạm nằm trong RAM, mất theo
```

---

## Phần B. Triển khai production

Làm trên máy chủ đang chạy LingoBrain, từ thư mục chứa mã HeroX.

### B1. Kiểm điều kiện

```bash
docker version --format '{{.Server.Os}}'    # → linux
docker compose version                       # có Compose v2
docker network ls --format '{{.Name}}' | grep -E '^(lingobrain_default|web)$'
docker compose -p lingobrain ps db           # db của LingoBrain đang chạy
```

- [ ] `linux`, có Compose v2.
- [ ] Thấy **đủ 2 mạng** `lingobrain_default` và `web`. Tên khác thì sửa khối `networks` trong `compose.yml` (và ghi lại tên thật).
- [ ] `db` của LingoBrain đang `running`/`healthy`.
- [ ] Đã backup DB LingoBrain theo quy trình đang dùng (bước B2 đổi quyền trong DB).

### B2. Tạo role `herox_app`

Chạy bằng tài khoản owner DB LingoBrain. Đặt mật khẩu mạnh, tránh để lại trong lịch sử shell.

```bash
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -v herox_app_password='<mật khẩu mạnh>' \
     -f herox.role_herox_app_113800_after.sql
```

Script cấp `SELECT` theo cột trên `public.users/sessions/progress/words/deck_meta` (không có `users.pass_hash`) và tạo schema `herox` thuộc `herox_app`. Chạy lại an toàn.

Kiểm (bằng tài khoản admin, chỉ đọc):

```sql
-- 1) Không có quyền ghi nào trên bảng LingoBrain: mọi cột can_* phải là false.
SELECT table_name,
       has_table_privilege('herox_app', 'public.' || table_name, 'INSERT') AS can_insert,
       has_table_privilege('herox_app', 'public.' || table_name, 'UPDATE') AS can_update,
       has_table_privilege('herox_app', 'public.' || table_name, 'DELETE') AS can_delete
FROM information_schema.tables
WHERE table_schema = 'public';

-- 2) Không đọc được mật khẩu băm: phải là false.
SELECT has_column_privilege('herox_app', 'public.users', 'pass_hash', 'SELECT') AS can_read_pass_hash;

-- 3) Schema herox thuộc herox_app: phải ra herox_app.
SELECT nspowner::regrole FROM pg_namespace WHERE nspname = 'herox';
```

- [ ] (1) toàn `false`. (2) `false`. (3) `herox_app`.

### B3. Tạo `.env`

Tạo `.env` cạnh `compose.yml` từ [`.env.example`](../.env.example). **Không commit**, chỉ chủ sở hữu được đọc (`chmod 600 .env`).

```bash
DATABASE_URL=postgres://herox_app:<mật khẩu>@db:5432/<tên DB của LingoBrain>
PGSSL=false
```

`PORT` và `TRUST_PROXY_HOPS` đã đặt trong `compose.yml`, không cần ghi.

- [ ] Host là `db` (tên service trong mạng `lingobrain_default`), không phải `localhost`.
- [ ] User là `herox_app`, không dùng tài khoản owner.
- [ ] `git status` không thấy `.env`.

### B4. Build và chạy container

```bash
docker compose up -d --build
docker compose ps                       # herox: healthy (chờ tối đa ~1 phút)
docker compose logs --tail=100 herox
docker compose exec herox wget -qO- http://127.0.0.1:3180/herox/api/ready   # → {"status":"ready"}
```

- [ ] `herox` ở trạng thái `healthy`.
- [ ] Log không có lỗi kết nối DB, không có `permission denied`, không lộ token hay chuỗi kết nối.
- [ ] `/herox/api/ready` trả `{"status":"ready"}` (migration xong).

Kiểm migration đã chạy (SQL, tài khoản admin):

```sql
SELECT name, applied_at FROM herox.schema_migrations ORDER BY name;
```

- [ ] Có 4 dòng, từ `001-herox-schema.sql` tới `004-story.sql`.

### B5. Thêm route proxy

Proxy phải **giữ nguyên đường dẫn** (không cắt tiền tố `/herox`) và chuyển `X-Forwarded-For` (một proxy đứng trước, khớp `TRUST_PROXY_HOPS=1`).

**Cách A** (khi server đã có route file tĩnh): một route cho cả `/herox/`.

```nginx
location /herox/ {
  proxy_pass http://herox:3180;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Cách B** (dùng được ngay): proxy chuyển API vào container, tự phục vụ file tĩnh client.

1. Lấy bản build client từ image, chép vào thư mục mà container proxy đọc được (ví dụ một bind mount của proxy):

   ```bash
   cid=$(docker create herox:latest)
   docker cp "$cid":/app/client/dist ./herox-client
   docker rm "$cid"
   # chép ./herox-client vào thư mục proxy phục vụ, ví dụ /srv/www/herox
   ```

2. Thêm route (đường dẫn `alias` theo chỗ đã chép ở trên):

   ```nginx
   location /herox/api/ {
     proxy_pass http://herox:3180;
     proxy_set_header Host $host;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }

   location /herox/ {
     alias /srv/www/herox/;
     try_files $uri $uri/ /herox/index.html;
   }
   ```

   Mỗi lần cập nhật phiên bản phải lấy lại `client/dist` từ image mới (lặp bước 1).

Rồi kiểm cú pháp và reload proxy theo cách đang dùng cho LingoBrain (nginx: `nginx -t` rồi `nginx -s reload`).

- [ ] `nginx -t` (hoặc tương đương) báo cấu hình hợp lệ.
- [ ] Các route của LingoBrain vẫn chạy như trước.

### B6. Kiểm sau triển khai

```bash
curl -fsS https://<domain>/herox/api/health    # → {"status":"ok"}
curl -fsS https://<domain>/herox/api/ready     # → {"status":"ready"}
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/herox/api/me   # → 401
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/herox/          # → 200
```

- [ ] Đủ 4 kết quả.

Kiểm bằng trình duyệt (tài khoản LingoBrain của bạn):

- [ ] Đăng nhập LingoBrain trên cùng domain, mở `https://<domain>/herox/` → vào được game (lần đầu có màn tạo nhân vật).
- [ ] Số từ đã học trong Thư viện khớp với LingoBrain.
- [ ] Đánh xong một trận, tải lại trang: vàng và tiến độ còn nguyên.
- [ ] DevTools → Network: không có request `POST/PUT/PATCH/DELETE` nào ngoài `/herox/api/`.
- [ ] Không đăng nhập (cửa sổ ẩn danh): dừng ở màn mời đăng nhập, không trắng trang.

Kiểm dữ liệu chỉ ghi vào schema `herox` (SQL, admin):

```sql
SELECT user_id, name, gold FROM herox.heroes ORDER BY user_id DESC LIMIT 5;
```

- [ ] Thấy nhân vật vừa tạo. Bảng `public.*` của LingoBrain không đổi (quyền đã chặn ở B2).

---

## Cập nhật phiên bản

```bash
git pull
docker compose up -d --build
docker compose ps                     # herox: healthy
```

- [ ] `herox` healthy, `/herox/api/ready` trả `ready`. Migration mới tự chạy lúc khởi động (khoá advisory, chạy lại an toàn); trong lúc chạy `/ready` trả 503.
- [ ] Cách B: lấy lại `client/dist` từ image mới (B5 bước 1).

## Rollback

1. Gỡ route `/herox/` (và `/herox/api/`) khỏi proxy, reload proxy. LingoBrain không bị ảnh hưởng.
2. `docker compose down`. **Không** thêm `-v`: HeroX không có volume; dữ liệu nằm trong schema `herox` của Postgres LingoBrain và được giữ nguyên.
3. Quay lại bản trước: `git checkout <commit cũ>` rồi `docker compose up -d --build`. Migration chỉ thêm bảng/cột nên bản cũ vẫn chạy trên schema mới.
4. Gỡ hẳn HeroX (**mất dữ liệu game**): backup trước bằng `pg_dump -n herox`, rồi chạy file `_before.sql` của script role. Chỉ làm khi đã có quyết định xoá dữ liệu.

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân hay gặp | Cách xử lý |
|---|---|---|
| `network lingobrain_default declared as external, but could not be found` | Tên mạng khác | `docker network ls`, sửa khối `networks` trong `compose.yml` |
| `herox` mãi `starting`/`unhealthy`, log báo `ECONNREFUSED` hoặc `ENOTFOUND db` | Không chung mạng với `db`, hoặc sai host | Kiểm `DATABASE_URL` dùng host `db`, container nằm trong `lingobrain_default` |
| Log `password authentication failed for user "herox_app"` | Sai mật khẩu trong `.env` | Sửa `.env`, chạy lại `docker compose up -d` |
| Log `permission denied ...` hoặc `/ready` mãi 503 | Chưa chạy script role, hoặc schema `herox` không thuộc `herox_app` | Chạy lại B2 và các câu kiểm |
| `/herox/` 404, `/herox/api/health` vẫn ok | Server chưa phục vụ file tĩnh | Dùng cách B ở B5 |
| `/herox/api/*` 404 qua proxy, gọi thẳng container thì ok | Proxy cắt tiền tố `/herox` | `proxy_pass http://herox:3180;` không có đường dẫn phía sau |
| Mọi người dùng bị giới hạn tần suất như chung một IP | Proxy không chuyển `X-Forwarded-For` | Thêm `proxy_set_header X-Forwarded-For ...` |
| Vào game báo phiên hết hạn dù đã đăng nhập LingoBrain | Mở HeroX khác domain với LingoBrain (token nằm trong `localStorage` theo domain) | Mở HeroX dưới cùng domain với LingoBrain |

## Môi trường thử không cần Docker

`npx playwright test` tự dựng Postgres nhúng (PGlite, cổng 55432), server (3180) và client bản build dev qua `vite preview` (5181); xem mục E2E trong [`README.md`](../README.md#e2e).
