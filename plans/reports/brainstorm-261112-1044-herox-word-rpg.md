# Brainstorm: HeroX — game nhập vai học từ tiếng Anh, dùng chung dữ liệu với LingoBrain (`D:\project\eng`)

Ngày: 2026-11-12 · Trạng thái: chờ người dùng chốt 4 câu hỏi ở cuối

## 1. Bằng chứng đã xác minh

| Điều | Nguồn |
|---|---|
| `eng` (LingoBrain) là PWA + Node.js + PostgreSQL 17, chạy Docker Compose (`app` + `db`), app nối mạng ngoài `web` (reverse proxy) | `D:\project\eng\compose.yml`, `Dockerfile` |
| Tài khoản: bảng `users`, `sessions` (lưu `token_hash`, hết hạn trượt 180 ngày); API dùng `Authorization: Bearer <token>` | `server/schema.sql:5-10`, `server/auth-and-sync-routes.js:38-48` |
| Tiến độ học lưu **một khối jsonb / user** ở bảng `progress.data`; gộp bằng `mergeSync` (giao hoán, idempotent), trần 8 MB | `server/schema.sql:11-12`, `auth-and-sync-routes.js:96-109`, `js/sync-merge.js` |
| Payload v1: `{ v, srsEpoch, srs:{[wordId]:{ef,ivl,due,state,reps,lapses,last,...}}, cfg, plan, day, gameScore, boss }` | `js/sync-merge.js:1-10` |
| "Đã học" = Đang nhớ + Đã thuộc; "thuộc" = khoảng cách ≥ 21 ngày | `eng/README.md` (Tab Tiến bộ) |
| Bộ từ ở bảng `words` (id, word, ipa, pos, meaning, context, emoji, mnemonic…) ~5000 mục | `server/schema.sql:15-20`, `js/sync-merge.js:15` |
| `eng` **đã có** game nhập vai "Pháp sư Lexoria": 5 hệ nguyên tố, 35 chiêu, 30 dạng tiến hoá, 12 quái, 28 đoạn truyện, sprite Ninja Adventure, lưu `eng.boss.v1` (xp, wins, element, evo) | `docs/system-architecture.md:42-80`, `js/boss-progress-sync-merge.js:42-44` |
| Game trong `eng` theo luật: trả lời đúng **không** giãn lịch SM-2, sai thì đẩy từ lên đầu phiên ôn kế | `eng/README.md` (Game từ vựng) |
| pixelfx: 244 hiệu ứng pixel, MIT (cả code lẫn effect, dùng thương mại được; riêng font Patch Pixel không thuộc MIT). Dùng runtime bằng JS (`createFx`, `fx.update/draw`) hoặc render sẵn ra sprite sheet PNG + JSON kiểu Aseprite (Phaser đọc được) | https://github.com/patch-gg/pixelfx (README, LICENSE) |
| `D:\project\HeroX` hiện trống (chỉ có `.git`, 1 commit) | `Get-ChildItem` |

Chưa kiểm tra: tên key `localStorage` lưu token của `eng`; LDtk bản mới nhất và loader cho engine chọn; domain production thật của `eng`.

## 2. Hợp đồng brainstorm

**Outcome.** Game web nhập vai pixel art HeroX, chơi tốt trên PC (bàn phím) và iPhone (cảm ứng, PWA). Người chơi đăng nhập bằng tài khoản LingoBrain; số từ đã học/đã thuộc quyết định cấp, kỹ năng, vùng mở khoá, trang bị và ngoại trang. Chiến đấu bằng gõ từ hoặc chọn từ trên vòng từ cố định, ghép chuỗi để ra combo. Có cốt truyện, thành trì để nâng cấp, map làm bằng LDtk, hiệu ứng từ pixelfx. Deploy bằng Docker.

**Constraints.**
- Dùng chung Postgres với `eng`; **không** sửa schema, API, `mergeSync` của `eng` khi chưa được đồng ý (hợp đồng chung, có test).
- HeroX chỉ **đọc** `progress`, `words`, `users`, `sessions`; dữ liệu game lưu ở schema riêng `herox`.
- Không làm hỏng lịch SM-2: game không được kéo dài lịch ôn (giữ đúng luật game của `eng`).
- iPhone Safari: bàn phím ảo che màn, giới hạn bộ nhớ WebGL, âm thanh chỉ mở sau chạm đầu tiên.
- Tài nguyên phải có license dùng được: pixelfx (MIT), LDtk (MIT), Ninja Adventure (CC0, `eng` đang dùng).
- Không đưa dữ liệu thật của người dùng vào log/commit. Agent không tự deploy (bậc 1).

**Non-goals (bản đầu).** Nhiều người chơi, PvP, chat; cửa hàng tiền thật; app native App Store; sửa giao diện `eng`; AI sinh truyện động; tự viết engine game.

**Acceptance criteria.**
1. Đăng nhập bằng tài khoản `eng` → HeroX hiện đúng số từ đã học / đã thuộc khớp tab Tiến bộ của `eng` (cùng tài khoản, cùng thời điểm).
2. Học thêm từ trong `eng` + sync → mở lại HeroX thấy chiêu/vùng mới mở theo bảng mốc.
3. Trận đấu: gõ đúng từ → tung chiêu có hiệu ứng pixelfx; chế độ vòng từ chơi được hoàn toàn bằng cảm ứng; ghép chuỗi ≥3 từ ra combo.
4. Thành trì: nâng cấp trang bị, kỹ năng, đổi ngoại trang; lưu server, đổi máy vẫn còn.
5. Ít nhất 1 chương truyện hoàn chỉnh với map LDtk (thành trì + 1 vùng + 1 trùm).
6. 60 fps trên PC tầm trung, ≥ 30 fps ổn định trên iPhone 12 trở lên (Safari + PWA).
7. `docker compose up` chạy được HeroX cạnh `eng`, dùng chung DB, có healthcheck.
8. Không ghi gì vào `progress` của `eng` (kiểm bằng test + quyền DB read-only).

## 3. Thiết kế game đề xuất

### 3.1 Cốt truyện (bản gốc, đề xuất)

> Cập nhật 2026-11-12: bối cảnh đổi sang thiên đàng / địa ngục, phong cách kiểu Diablo. Bản chốt nằm ở plan 261112-1053-herox-chapter-1-playable (phase 07, 10); phần dưới chỉ còn giá trị lịch sử.

**Thế giới Verbania.** Mọi vật tồn tại nhờ "Chữ Gốc". Lời nguyền **Hư Ngôn** của **Vua Câm Lặng** xoá dần chữ: cây không còn tên thì khô, cầu không còn tên thì sập, người mất tiếng nói. Quái vật "Kẻ Vô Danh" sinh ra từ những chữ bị xoá.

**Nhân vật chính.** Một **Người Giữ Chữ** cuối cùng: mỗi từ học được thật ngoài đời (ở LingoBrain) là một Chữ Gốc khôi phục lại, thành năng lượng phép và vật liệu xây thành.

**Thành trì Lexhold.** Pháo đài đổ nát giữa thế giới, nơi hồi sinh dần theo số từ đã học: lò rèn (trang bị), tháp phép (kỹ năng), xưởng may (ngoại trang), thư viện (nhật ký truyện + từ đã thu).

**5 chương / 5 vùng** (mở theo số từ đã học, số liệu là đề xuất, cân lại khi playtest):

| Chương | Vùng | Mở khi đã học | Chủ đề từ gợi ý | Trùm |
|---|---|---|---|---|
| 1 | Làng Sương Sớm | 0 | đời sống hằng ngày | Bù Nhìn Câm |
| 2 | Rừng Tiếng Vọng | 100 | thiên nhiên, động từ di chuyển | Hươu Bóng |
| 3 | Cảng Muối | 300 | mua bán, du lịch | Thuyền Trưởng Mất Tên |
| 4 | Sa Mạc Chữ Vỡ | 600 | công việc, cảm xúc | Nhân Sư Ngược Nghĩa |
| 5 | Ngai Câm Lặng | 1000 + 200 từ đã thuộc | tổng hợp | Vua Câm Lặng |

Kết thúc: Vua Câm Lặng là Người Giữ Chữ đời trước, đã quên hết chữ vì bỏ ôn; trận cuối dùng toàn từ "đã thuộc". Thông điệp khớp mục tiêu học: không ôn thì mất chữ.

### 3.2 Ánh xạ tiến độ học → nhân vật

| Dữ liệu học (đọc từ `progress.data.srs` + `words`) | Thành gì trong game |
|---|---|
| Số từ đã học (state `review`/`relearn`, `reps > 0`) | Cấp anh hùng, mở vùng, mở công trình thành trì |
| Số từ đã thuộc (`ivl ≥ 21`) | Bậc kỹ năng (sát thương, hiệu ứng mạnh hơn), mở ngoại trang hiếm |
| Từ loại `pos`: động từ | Chiêu tấn công |
| Danh từ | Triệu hồi / khiên / bẫy |
| Tính từ | Buff, debuff |
| Trạng từ, giới từ (`up`, `away`, `quickly`…) | **Kỹ năng di chuyển**: dash, nhảy, dịch chuyển |
| Chuỗi ngày học, tỉ lệ nhớ 30 ngày | Tài nguyên (vàng, pha lê) để nâng cấp ở thành trì |
| Từ hay quên (`lapses` cao) | Xuất hiện thành "quái tinh anh" để ôn lại, thắng cho nhiều vật liệu |

Số liệu là đọc snapshot, tính ở server HeroX; client không tự khai số từ (chống gian lận đơn giản).

### 3.3 Lối chơi

- **Khám phá:** đi trên map LDtk (WASD/phím mũi tên trên PC, joystick ảo trên iPhone), nói chuyện NPC, mở rương, vào cổng trận.
- **Chiến đấu thời gian thực nhẹ:** quái hiện **nghĩa tiếng Việt + emoji**; người chơi:
  - **Gõ từ** (PC, hoặc iPhone nếu muốn): nhớ chủ động → sát thương đầy đủ.
  - **Vòng từ** (mặc định trên iPhone): vòng tròn cố định 6 ô chứa từ đã trang bị + 1–2 từ nhiễu; chạm để tung chiêu. Đây là nhận diện nên sát thương thấp hơn gõ (~70%), giữ được động lực rèn nhớ chủ động.
- **Ghép chuỗi (combo):** tung liên tiếp các từ cùng từ loại hoặc ghép thành cụm hợp lệ (ví dụ `run` → `away` → `quickly`) trong cửa sổ thời gian → nhân sát thương, chiêu kết liễu. Danh sách cụm ghép lấy từ `context` của bộ từ hoặc bảng cụm biên tập tay.
- **Sai từ:** HeroX ghi lại từ sai trong schema `herox`. Có ghi ngược về SRS của `eng` hay không là câu hỏi mở số 3.

### 3.4 Thành trì

Nâng cấp bằng vàng/pha lê + điều kiện số từ: lò rèn (vũ khí, giáp: chỉ số), tháp phép (lên bậc chiêu, đổi chiêu trên vòng từ), xưởng may (ngoại trang theo mốc từ đã học/đã thuộc, chỉ là hình), thư viện (đọc lại truyện, nghe từ đã thu). Bản thân thành trì là một map LDtk, các công trình đổi sprite theo cấp.

## 4. Phương án kỹ thuật

### 4.1 Engine game

| | A. Phaser + TypeScript + Vite (đề xuất) | B. Excalibur.js | C. Tái dùng engine canvas tự viết của Lexoria |
|---|---|---|---|
| LDtk | Tự viết loader đọc JSON LDtk (khoảng 200 dòng: tile layer, IntGrid va chạm, entity) | Có plugin LDtk chính thức | Phải tự viết cả hệ map, camera, va chạm |
| pixelfx | Dùng sprite sheet render sẵn (README nói Phaser đọc được atlas JSON) | Dùng sprite sheet hoặc code | Dùng code runtime |
| iPhone | WebGL, scale mode, input cảm ứng tốt; cộng đồng lớn | Ổn, cộng đồng nhỏ hơn | Không có camera/tilemap/physics |
| Giả định chịu lực | Loader LDtk tự viết đủ dùng (định dạng JSON ổn định, có tài liệu) | Plugin theo kịp bản LDtk mới | Đủ nhân lực để viết engine |
| Hỏng đầu tiên khi | LDtk đổi định dạng lớn (ít xảy ra) | Plugin chậm cập nhật, ít ví dụ cho mobile | Ngay khi cần map nhiều màn + di chuyển tự do |

Đề xuất **A**: rẻ nhất để bỏ nếu sai (loader nhỏ), hệ sinh thái lớn nhất cho web mobile. Hiệu ứng pixelfx render sẵn thành sprite sheet lúc build (nhẹ hơn chạy code hiệu ứng mỗi khung trên iPhone); hiệu ứng nào cần tham số động mới dùng code runtime.

### 4.2 Cách nối với dữ liệu `eng`

| | A. Cùng origin, cùng DB, schema riêng (đề xuất) | B. Gọi API `eng` | C. Nhúng HeroX vào repo `eng` |
|---|---|---|---|
| Mô tả | Proxy trỏ `/herox/` vào container HeroX. HeroX đọc token từ `localStorage` cùng origin, server HeroX xác thực bằng `sessions.token_hash` (đọc DB), đọc `progress`/`words` read-only, ghi schema `herox` | HeroX gọi `/api/login`, `PUT /api/sync` của `eng` | Thêm module vào `eng` như Lexoria |
| Đăng nhập liền mạch | Có (đã đăng nhập `eng` là vào thẳng) | Phải đăng nhập lại; `PUT /api/sync` là ghi, không có API chỉ đọc | Có |
| Đụng code `eng` | Không | Phải thêm API đọc (đổi hợp đồng) | Nhiều; `eng` đã 76+ module, PWA cache, test |
| Giả định chịu lực | Cách băm token (`hashToken`) và dạng `progress.data` giữ ổn định | `eng` chịu thêm API | `eng` chịu thêm tải và độ phức tạp |
| Hỏng đầu tiên khi | `eng` đổi cách băm token hoặc payload (cần test hợp đồng ở HeroX) | Rate limit sync 30/phút/user | Bundle PWA phình, iPhone tải chậm |

Đề xuất **A**, kèm: DB role `herox_app` chỉ `SELECT` trên `public.users/sessions/progress/words`, toàn quyền trên schema `herox`; HeroX copy (không import) đúng hàm băm token + bộ đọc payload, có test hợp đồng để báo động khi `eng` đổi.

### 4.3 Deploy

Repo HeroX có `Dockerfile` riêng (build Vite → static, Node API nhỏ). Compose của HeroX nối vào mạng của Postgres `eng` + mạng `web` của proxy. Migration schema `herox` chạy khi khởi động (idempotent, giống `eng`). Script tạo role `herox_app` phải qua quy trình backup trong `D:\DB-Backup\HeroX\...` trước khi người dùng tự chạy.

## 5. Phương án tốt hơn (so với hướng người dùng nêu)

Đã đề xuất tận dụng bảng chiêu/cân bằng của Lexoria (`boss-game-spell-math.js`, `boss-game-skill-roster.js`) để tiết kiệm công cân bằng. **Người dùng chọn làm lại hoàn toàn** (2026-11-12) → HeroX tự thiết kế hệ chiêu, công thức, cân bằng; không chép code/dữ liệu Lexoria. Bộ sprite Ninja Adventure là tài sản CC0 bên thứ ba, vẫn được chọn độc lập nếu hợp phong cách (không tính là dùng lại Lexoria).

## 5b. Quyết định đã chốt (2026-11-12)

| Câu hỏi | Quyết định |
|---|---|
| Quan hệ với Lexoria | Làm lại hoàn toàn, game riêng, chạy song song, không đụng code `eng` |
| Vị trí chạy | Cùng domain với `eng`, đường dẫn `/herox/`, đăng nhập liền mạch (phương án 4.2-A) |
| Ghi ngược SRS | Không. Từ sai chỉ lưu schema `herox`, thành "quái tinh anh" |
| Cốt truyện | Dùng hướng Verbania / Người Giữ Chữ / Lexhold / Vua Câm Lặng (mục 3.1) |

## 6. Rủi ro

- Payload `progress` là hợp đồng nội bộ của `eng`, có thể đổi → test hợp đồng ở HeroX + đọc phòng thủ (thiếu trường thì coi là 0).
- Bàn phím ảo iPhone che nửa màn → vòng từ làm mặc định trên cảm ứng; ô gõ neo trên bàn phím (`visualViewport`).
- Gian lận: số từ chỉ tính ở server từ DB; người tự bấm "Dễ" ở `eng` để lên cấp nhanh thì HeroX không chặn được, chấp nhận ở bản đầu.
- Phạm vi lớn (truyện + 5 vùng + thành trì + 2 kiểu nhập + combo) → plan cần chia phase, chương 1 chạy trọn trước rồi mới nhân vùng.

## 7. Câu hỏi chưa giải quyết

- Key `localStorage` chứa token của `eng` và domain production thật: tra ở bước plan.
- Proxy hiện tại (mạng `web`) là gì, ai cấu hình route `/herox/`: cần người vận hành xác nhận trước phase deploy.
