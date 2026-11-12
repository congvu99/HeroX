# Deploy HeroX lên VPS (cạnh LingoBrain)

Chạy HeroX trên **đúng VPS đang chạy LingoBrain**, cùng cách làm với hướng dẫn VPS của LingoBrain (`eng/docs/deployment-vps-guide.html`): user `deploy`, code ở `/srv/apps/<app>`, Caddy dùng chung qua mạng `web`, phát hành bằng `deploy/deploy.sh`. Làm lần lượt chương 1 → 6, mất khoảng 20–30 phút.

Agent không deploy. Mọi lệnh dưới đây do bạn chạy và tự đánh dấu ☐. Kết quả khác mô tả thì dừng lại, tra [chương 10](#10-xử-lý-sự-cố).

**Nhãn trên mỗi khối lệnh:** `WINDOWS` máy của bạn · `SERVER` phiên `ssh vps`, user `deploy` · `FILE` nội dung một file.

**Thay trong lệnh:** `<domain>` là tên miền LingoBrain đang chạy (ví dụ `lingobrain.<tên>.duckdns.org`). HeroX **phải** nằm dưới cùng tên miền này ở đường dẫn `/herox/`, vì phiên đăng nhập LingoBrain lưu trong `localStorage` theo tên miền.

## 0. Tổng thể

```
Người dùng https://<domain>/
        │
        ▼
Caddy (đã có, cổng 80/443, HTTPS tự động) ── file /srv/caddy/conf/sites/lingobrain.caddy
        ├── /herox/api/*  → herox:3180       Node, API HeroX. Không mở cổng
        ├── /herox/*      → herox-web:80     nginx, file tĩnh client HeroX. Không mở cổng
        └── còn lại       → lingobrain:3000  LingoBrain như cũ
                               │
herox ── mạng lingobrain_default ──► db (Postgres 17 của LingoBrain)
          role herox_app: chỉ ĐỌC bảng LingoBrain, ghi trong schema `herox`
```

| Dữ liệu | Ở đâu |
|---|---|
| Tài khoản, phiên, bộ từ, tiến độ học | Bảng `public.*` của LingoBrain. HeroX chỉ đọc |
| Nhân vật, vàng, công trình, trận, mốc truyện | Schema `herox` trong **cùng DB** `lingobrain`. Server tự tạo bảng lúc khởi động |
| Backup | Script backup của LingoBrain dump cả DB nên đã gồm schema `herox` ([chương 8](#8-backup--khôi-phục)) |

## 1. Điều kiện trước

- ☐ LingoBrain đang chạy trên VPS theo hướng dẫn VPS của nó: `/srv/apps/lingobrain`, `docker compose ps` thấy `app` và `db` đều `healthy`, có Caddy dùng chung và mạng `web`.
- ☐ **LingoBrain đã có bản service worker bỏ qua `/herox/`.** PR https://github.com/congvu99/LingoBrain/pull/1 (nhánh `fix/sw-bypass-herox-path`) đã merge vào `main` và đã chạy `bash deploy/deploy.sh` của LingoBrain. Thiếu bước này, service worker của LingoBrain (scope `/`) có thể trả bản HeroX cũ đã cache hoặc trang LingoBrain thay cho HeroX.
- ☐ Repo HeroX đã push: trang https://github.com/congvu99/HeroX thấy `Dockerfile`, `compose.yml`, `deploy/deploy.sh`, `deploy/nginx-web.conf`.
- ☐ VPS còn ≥ 1,5 GB RAM trống lúc build (build client Vite + TypeScript nặng hơn LingoBrain) và ≥ 2 GB đĩa.

Kiểm nhanh:

`SERVER`
```bash
cd /srv/apps/lingobrain && docker compose ps
docker network ls --format '{{.Name}}' | grep -xE 'web|lingobrain_default'
free -h; df -h /
```

- ☐ `app`, `db`: `Up … (healthy)`.
- ☐ In ra đủ 2 dòng `web` và `lingobrain_default`.

## 2. Clone code

`SERVER`
```bash
cd /srv/apps
git clone --depth 1 https://github.com/congvu99/HeroX.git herox
cd /srv/apps/herox
git log --oneline -1
ls Dockerfile compose.yml deploy/
```

- ☐ Dấu nhắc là `deploy@…$` (không phải `root@…#`). Chạy bằng root thì file thuộc root, `deploy.sh` lỗi quyền.
- ☐ `git log` in mã commit mới nhất trên GitHub.
- ☐ `ls` in đủ `Dockerfile compose.yml` và `deploy.sh nginx-e2e.conf nginx-web.conf`.

Repo private: GitHub sẽ hỏi đăng nhập. Dùng deploy key hoặc token chỉ đọc, giống cách đã clone LingoBrain.

## 3. Tạo role `herox_app` + file `.env`

HeroX không dùng tài khoản `lingo` (chủ DB). Script tạo role `herox_app`: chỉ `SELECT` đúng các cột cần trên `public.users/sessions/progress/words/deck_meta` (không có `users.pass_hash`), và tạo schema `herox` thuộc `herox_app`. Script nằm ngoài repo: `D:\DB-Backup\HeroX\2026\20261112\herox.role_herox_app_113800_after.sql` (rollback: file `_before.sql` cùng thư mục).

**3.1. Đưa script lên VPS**

`WINDOWS`
```powershell
scp "D:\DB-Backup\HeroX\2026\20261112\herox.role_herox_app_113800_after.sql" vps:/tmp/herox-role.sql
```

**3.2. Backup DB LingoBrain trước khi đổi quyền**

`SERVER`
```bash
cd /srv/apps/lingobrain && bash deploy/backup.sh
```

- ☐ In `backup ok: /srv/backups/lingobrain/lingobrain-….dump`.

**3.3. Tạo role, ghi `.env`** (dán nguyên khối)

`SERVER`
```bash
cd /srv/apps/herox
if [ -f .env ]; then
  echo ".env đã có, bỏ qua (role đã tạo từ lần trước)"
else
  HEROX_DB_PASSWORD=$(openssl rand -hex 24)
  (cd /srv/apps/lingobrain && docker compose exec -T db \
      psql -U lingo -d lingobrain -v ON_ERROR_STOP=1 -v herox_app_password="$HEROX_DB_PASSWORD") \
    < /tmp/herox-role.sql \
  && printf 'DATABASE_URL=postgres://herox_app:%s@db:5432/lingobrain\nPGSSL=false\n' "$HEROX_DB_PASSWORD" > .env
  unset HEROX_DB_PASSWORD
fi
chmod 600 .env
ls -l .env
rm -f /tmp/herox-role.sql
```

- ☐ psql in bảng quyền: `deck_meta`, `progress`, `sessions`, `users`, `words` với các cột `…:SELECT`. **Không** có `pass_hash`.
- ☐ Dòng cuối của psql: `herox | herox_app` (schema `herox` thuộc `herox_app`).
- ☐ `ls -l .env` là `-rw------- 1 deploy deploy`.
- ☐ Không thấy mật khẩu in ra màn hình. Mật khẩu là chuỗi hex nên không cần URL-encode.

`if [ -f .env ]`: chỉ tạo role và `.env` một lần; `.env` chỉ được ghi khi psql chạy thành công. Script role **không đổi mật khẩu** khi role đã có; xoá `.env` rồi chạy lại sẽ làm lệch mật khẩu (xử lý ở [chương 10](#10-xử-lý-sự-cố)).

**3.4. Kiểm quyền** (chỉ đọc)

`SERVER`
```bash
cd /srv/apps/lingobrain
docker compose exec -T db psql -U lingo -d lingobrain -c "
SELECT table_name,
       has_table_privilege('herox_app', 'public.' || table_name, 'INSERT') AS can_insert,
       has_table_privilege('herox_app', 'public.' || table_name, 'UPDATE') AS can_update,
       has_table_privilege('herox_app', 'public.' || table_name, 'DELETE') AS can_delete
FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;"
docker compose exec -T db psql -U lingo -d lingobrain -tAc \
  "SELECT has_column_privilege('herox_app', 'public.users', 'pass_hash', 'SELECT');"
```

- ☐ Mọi cột `can_insert`, `can_update`, `can_delete` là `f`.
- ☐ Lệnh thứ hai in `f` (không đọc được mật khẩu băm).

## 4. Chạy app

`SERVER`
```bash
cd /srv/apps/herox
bash deploy/deploy.sh
docker compose ps
docker compose logs --tail 30 herox
```

- ☐ Script kết thúc bằng `deploy ok: <commit>`. Lần đầu build 3–8 phút (cài npm, build client).
- ☐ `ps`: `herox` và `herox-web` đều `Up … (healthy)`.
- ☐ Log `herox` có `Server listening at http://0.0.0.0:3180` rồi `Đã áp dụng migration: 001-herox-schema.sql, 002-battles.sql, 003-citadel.sql, 004-story.sql`. Lần deploy sau là `Schema herox đã cập nhật`.
- ☐ Log không có `password authentication failed`, `permission denied`, không lộ token hay chuỗi kết nối.

Báo `deploy FAILED`: đọc 60 dòng log script in ra, tra [chương 10](#10-xử-lý-sự-cố).

## 5. Gắn vào Caddy

HeroX dùng chung site của LingoBrain. Sửa file site của LingoBrain, giữ nguyên tên miền đang có ở dòng đầu.

**5.1. Xem file hiện tại, lưu bản cũ để rollback**

`SERVER`
```bash
cat /srv/caddy/conf/sites/lingobrain.caddy
cp /srv/caddy/conf/sites/lingobrain.caddy /srv/caddy/conf/sites/lingobrain.caddy.bak-$(date +%Y%m%d)
```

**5.2. Thay nội dung** (thay `<domain>` bằng đúng tên miền ở dòng đầu file cũ)

`FILE` `/srv/caddy/conf/sites/lingobrain.caddy`
```caddy
<domain> {
	encode zstd gzip

	redir /herox /herox/ 308

	# HeroX: API vào server Node, còn lại là file tĩnh client
	handle /herox/api/* {
		reverse_proxy herox:3180
	}
	handle /herox/* {
		reverse_proxy herox-web:80
	}

	# LingoBrain như cũ
	handle {
		reverse_proxy lingobrain:3000
	}
}
```

- Giữ nguyên đường dẫn `/herox/...` khi chuyển vào container (dùng `handle`, **không** dùng `handle_path`), vì server HeroX định tuyến theo `/herox/api/…`.
- Caddy tự gửi `X-Forwarded-For` với IP người dùng; khớp `TRUST_PROXY_HOPS=1` trong `compose.yml`.

**5.3. Kiểm và nạp lại Caddy**

`SERVER`
```bash
cd /srv/caddy
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
docker compose exec -w /etc/caddy caddy caddy reload
```

- ☐ `validate` in `Valid configuration`.
- ☐ `reload` không báo lỗi.

## 6. Kiểm tra

`WINDOWS`
```powershell
curl.exe -s -o NUL -w "%{http_code}\n" https://<domain>/herox/api/health   # 200
curl.exe -s https://<domain>/herox/api/ready                                # {"status":"ready"}
curl.exe -s -o NUL -w "%{http_code}\n" https://<domain>/herox/api/me       # 401 (chưa đăng nhập)
curl.exe -s -o NUL -w "%{http_code}\n" https://<domain>/herox/             # 200
curl.exe -s -o NUL -w "%{http_code}\n" https://<domain>/herox              # 308 (chuyển sang /herox/)
curl.exe -s -o NUL -w "%{http_code}\n" https://<domain>/api/words          # 200 (LingoBrain không bị ảnh hưởng)
```

- ☐ Đủ 6 kết quả như chú thích.

`SERVER`
```bash
sudo ss -tlnp | grep -v 127.0.0.
```

- ☐ Chỉ thấy 22, 80, 443. Thấy 3180 hoặc 5432 nghĩa là có cổng lọt ra ngoài.

**Trên trình duyệt** (tài khoản LingoBrain của bạn):

- ☐ Đăng nhập LingoBrain ở `https://<domain>/`, rồi mở `https://<domain>/herox/` → vào game, lần đầu có màn tạo nhân vật.
- ☐ Thư viện trong Lexhold: số từ đã học khớp LingoBrain.
- ☐ Đánh một trận, tải lại trang: vàng và mốc truyện còn nguyên.
- ☐ DevTools → Network: không có request `POST/PUT/PATCH/DELETE` nào ngoài `/herox/api/`.
- ☐ Cửa sổ ẩn danh (chưa đăng nhập): dừng ở màn mời đăng nhập, không trắng trang.
- ☐ Quay lại `https://<domain>/` → LingoBrain vẫn chạy bình thường, tiến độ không đổi.
- ☐ iPhone Safari: mở `/herox/`, xoay ngang, chơi được; "Thêm vào màn hình chính" mở ra HeroX (không phải LingoBrain).

**Kiểm dữ liệu** (chỉ đọc)

`SERVER`
```bash
cd /srv/apps/lingobrain
docker compose exec -T db psql -U lingo -d lingobrain -c "SELECT name, applied_at FROM herox.schema_migrations ORDER BY name;"
docker compose exec -T db psql -U lingo -d lingobrain -c "SELECT user_id, name, gold FROM herox.heroes ORDER BY user_id DESC LIMIT 5;"
```

- ☐ 4 migration, từ `001-herox-schema.sql` tới `004-story.sql`.
- ☐ Thấy nhân vật vừa tạo.

**Giám sát:** thêm monitor (UptimeRobot) gọi `https://<domain>/herox/api/ready` 5 phút/lần. Đừng monitor `/herox/api/health`: nó vẫn 200 khi DB chết.

## 7. Cập nhật & vận hành

**Phát hành bản mới** (sau khi đã push lên GitHub):

`WINDOWS`
```powershell
ssh vps "cd /srv/apps/herox && bash deploy/deploy.sh"
```

| Script in ra | Ý nghĩa | Làm gì |
|---|---|---|
| `deploy ok: …` | Đang chạy commit mới | — |
| `already at …` | Server đã chạy commit mới nhất | Quên push? Hoặc build lại: `FORCE=1 bash deploy/deploy.sh` |
| `deploy FAILED … rolled back` | Bản mới không lên, đã quay về bản cũ | Đọc log, sửa, push, chạy lại |
| `deploy khác đang chạy` | Lần deploy trước chưa xong | Đợi rồi chạy lại |

- Script backup DB LingoBrain (gồm schema `herox`) trước khi thay container, giống LingoBrain.
- Migration mới tự chạy lúc khởi động; trong lúc chạy `/herox/api/ready` trả 503 và script chờ tới khi xong.
- Đổi logic service worker của HeroX (`client/public/sw.js`) thì tăng `SW_VERSION` trong file đó trước khi push.
- Không sửa file trực tiếp trên server: sửa ở repo → push → deploy.

**Lệnh hay dùng** (trong `/srv/apps/herox`)

| Việc | Lệnh |
|---|---|
| Trạng thái / log | `docker compose ps` · `docker compose logs -f herox` |
| Đổi `.env` | `docker compose up -d --force-recreate herox` (không cần build) |
| Quay về bản cũ bằng tay | `docker images herox` → `IMAGE_TAG=<mã-commit> docker compose up -d --no-build` |
| Vào DB (schema herox) | `cd /srv/apps/lingobrain && docker compose exec db psql -U lingo -d lingobrain -c '\dt herox.*'` |
| RAM/CPU | `docker stats` (herox giới hạn 256 MB, herox-web 64 MB) |

## 8. Backup & khôi phục

Dữ liệu HeroX nằm trong DB `lingobrain`, nên cron backup đã đặt cho LingoBrain (`deploy/backup.sh`, 3:45 sáng) **đã gồm schema `herox`**. Không cần cron riêng.

- ☐ Kiểm một bản backup có schema `herox`:

`SERVER`
```bash
f=$(ls -t /srv/backups/lingobrain/lingobrain-*.dump | head -1)
cd /srv/apps/lingobrain && docker compose exec -T db pg_restore --list < "$f" | grep -c ' herox '
```

- ☐ In ra số > 0.

**Khôi phục:** làm theo chương "Backup & khôi phục" của hướng dẫn LingoBrain (`pg_restore … --clean`); thao tác đó khôi phục cả LingoBrain lẫn HeroX về cùng thời điểm. Dừng HeroX trước, chạy lại sau:

`SERVER`
```bash
cd /srv/apps/herox && docker compose stop herox
# … chạy lệnh khôi phục của LingoBrain …
cd /srv/apps/herox && docker compose start herox
```

## 9. Rollback & gỡ

**Tạm tắt HeroX, giữ dữ liệu** (LingoBrain không bị ảnh hưởng):

`SERVER`
```bash
cp /srv/caddy/conf/sites/lingobrain.caddy.bak-<yyyymmdd> /srv/caddy/conf/sites/lingobrain.caddy
cd /srv/caddy && docker compose exec -w /etc/caddy caddy caddy reload
cd /srv/apps/herox && docker compose down
```

`docker compose down` **không** kèm `-v`: HeroX không có volume, dữ liệu nằm trong schema `herox` và được giữ nguyên. Bật lại: chép lại nội dung chương 5.2, reload Caddy, `bash deploy/deploy.sh`.

**Gỡ hẳn HeroX (mất dữ liệu game):** chỉ làm khi đã quyết định xoá. Backup trước (chương 3.2), rồi chạy file `_before.sql` của script role bằng tài khoản `lingo` (cùng cách chạy ở chương 3.3, với file `herox.role_herox_app_113800_before.sql`), sau đó `rm -rf /srv/apps/herox`.

## 10. Xử lý sự cố

| Hiện tượng | Nguyên nhân | Xử lý |
|---|---|---|
| `network lingobrain_default declared as external, but could not be found` | Project LingoBrain không tên `lingobrain` | `docker network ls`; sửa tên mạng trong `compose.yml` ở repo → push → deploy |
| `deploy FAILED`, log `password authentication failed for user "herox_app"` | `.env` bị tạo lại sau khi role đã có | Đặt lại mật khẩu role khớp `.env`, xem khối lệnh ngay dưới bảng |
| Log `permission denied for schema herox` hoặc `/ready` mãi 503 | Chưa chạy script role, hoặc schema `herox` không thuộc `herox_app` | Làm lại chương 3.3–3.4 |
| Log `getaddrinfo ENOTFOUND db` | `herox` không nằm trong mạng `lingobrain_default` | `docker inspect herox-herox-1 --format '{{json .NetworkSettings.Networks}}'`; kiểm `compose.yml` |
| Build dừng giữa chừng, `Killed` hoặc `exit code 137` | Thiếu RAM lúc build | Tạm dừng thứ không cần, hoặc thêm swap 2 GB rồi chạy lại `deploy.sh` |
| `https://<domain>/herox/` 502 | `herox-web` chưa chạy hoặc sai alias | `docker compose ps`; trong Caddy phải là `herox-web:80` |
| `/herox/api/*` 502 | `herox` chưa chạy | `docker compose ps`, `docker compose logs herox` |
| `/herox/api/*` 404 dạng trang LingoBrain | Khối `handle /herox/api/*` thiếu hoặc nằm sau `handle` cuối | Sửa lại theo chương 5.2, reload Caddy |
| Vào `/herox/` thấy trang LingoBrain hoặc bản HeroX cũ sau deploy | LingoBrain chưa có bản SW bỏ qua `/herox/` | Merge + deploy PR LingoBrain ở chương 1; trên máy: đóng hẳn tab/app rồi mở lại |
| Game báo phiên hết hạn dù đã đăng nhập LingoBrain | Mở HeroX khác tên miền với LingoBrain | Mở `https://<domain>/herox/` đúng tên miền LingoBrain |
| Mọi người dùng bị giới hạn tần suất (429) cùng lúc | Số proxy tin cậy sai | Phải là `TRUST_PROXY_HOPS=1` (đã đặt trong `compose.yml`). Có Cloudflare trước Caddy → `2` |
| `$'\r': command not found` | Script bị CRLF | `sed -i 's/\r$//' deploy/*.sh` (repo đã ép LF qua `.gitattributes`) |
| `Not possible to fast-forward` | Có file bị sửa trực tiếp trên server | `git reset --hard origin/master` (không đụng `.env`) |
| Đầy ổ đĩa | Image cũ (mỗi bản ~200 MB cho 2 image) | `docker system df`, `docker image prune -f` |

**Đặt lại mật khẩu `herox_app` khớp `.env`** (mật khẩu chỉ đi qua biến, không in ra):

`SERVER`
```bash
cd /srv/apps/herox
HEROX_DB_PASSWORD=$(sed -n 's#^DATABASE_URL=postgres://herox_app:\([^@]*\)@.*#\1#p' .env)
printf "ALTER ROLE herox_app PASSWORD :'pw';\n" \
  | (cd /srv/apps/lingobrain && docker compose exec -T db psql -U lingo -d lingobrain -v ON_ERROR_STOP=1 -v pw="$HEROX_DB_PASSWORD")
unset HEROX_DB_PASSWORD
docker compose up -d --force-recreate herox
```

## Phụ lục A. Thử trước trên máy có Docker Linux (không bắt buộc)

`compose.dev.yml` dựng Postgres tạm + seed fixture + `herox` + nginx ở `http://localhost:8080/herox/`, không cần LingoBrain thật:

```bash
docker compose -f compose.dev.yml up --build -d --wait
E2E_BASE_URL=http://localhost:8080/herox/ npx playwright test
docker compose -f compose.dev.yml down
```

Không có Docker: `npx playwright test` tự dựng Postgres nhúng (PGlite, cổng 55432), server (3180) và client bản build dev qua `vite preview` (5181); xem mục E2E trong [`README.md`](../README.md#e2e).

## Câu hỏi còn mở

1. PR LingoBrain #1 (service worker bỏ qua `/herox/`) đã merge và deploy chưa? Đây là điều kiện bắt buộc ở chương 1.
2. Nhánh deploy là `master` (đang có trên GitHub). Đổi sang `main` thì sửa lệnh `git reset` ở chương 10.
