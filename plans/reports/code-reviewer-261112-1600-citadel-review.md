# Review: Thành trì Lexhold (citadel)

## Phạm vi
- shared: catalog (citadel/equipment/outfit/skill tier), `combat/damage-formula.ts`, `battle-state.ts`, `battle-types.ts`, `citadel-contract.ts`, `progression/citadel-rules.ts`.
- server: `003-citadel.sql`, `citadel/citadel-repository.ts`, `routes/citadel-routes.ts`, `http/utc-offset.ts`, `http/http-error.ts`, `battle/battle-preparation.ts`, `routes/battle-routes.ts`, `battle/battle-repository.ts`, `app.ts`, `server.ts`.
- client: `api/*`, `citadel/*`, `ui/panels/*`, `audio/word-pronunciation.ts`, `scenes/citadel-scene.ts`, `scenes/world-scene.ts`, `world/trigger-zones.ts`, test liên quan.
- Kiểm tra đã chạy: `npx vitest run` 44 file / 468 test đạt; `npm run typecheck` đạt; `npm run lint` 0 lỗi.

## Đánh giá chung
Luật nghiệp vụ nằm đúng ở server (`applyCitadelAction` chạy trong transaction, client chỉ hiển thị). `FOR UPDATE` + so `row_version` đúng ngữ nghĩa READ COMMITTED: request thứ hai chờ khoá, đọc lại bản đã commit, thấy version mới nên trả 409. SQL đều có tham số, chỉ ghi `herox.*`. Panel DOM chỉ dùng `textContent`. Không có lỗi Critical. Các vấn đề chính: hiệu năng khi người chơi đã học nhiều từ (bộ LingoBrain có 5033 từ), vòng từ bị kẹt khi chứa từ không còn "đã học", và dùng `pg` sai cách trong transaction.

## Critical
Không có.

## High

### H1. Tháp Phép vẽ toàn bộ từ đã học thành nút, mỗi lần chạm lại dựng lại cả panel
- Vị trí: `client/src/ui/panels/tower-panel.ts:59` (`view.words.map` → 1 nút/từ, không giới hạn), `:62` (`this.draw(view)` dựng lại toàn bộ bậc chiêu + vòng từ + kỹ năng sau mỗi lần bật/tắt). Thư viện đã giới hạn 200 dòng (`library-panel.ts`, `MAX_VISIBLE_WORDS`), Tháp Phép thì không.
- Kịch bản lỗi: bộ từ LingoBrain có 5033 từ (`D:\project\eng\words.json`). Người học vài nghìn từ mở Tháp Phép trên iPhone thì panel tạo vài nghìn `<button>`; mỗi lần chạm chọn từ lại tạo lại hết, gây giật rõ và cuộn dài khó dùng.
- Đề xuất: dùng lại ô tìm + `filterWords` như Thư viện, giới hạn số chip hiển thị (ví dụ 60, các từ đang gắn luôn hiện trước). Khi bật/tắt chỉ cập nhật `aria-pressed` của chip và nhãn nút Lưu, không gọi `draw` lại toàn panel.

## Medium

### M1. Vòng từ chứa từ không còn "đã học" thì không lưu được nữa
- Vị trí: `client/src/ui/panels/tower-panel.ts:54-68` (bản nháp bắt đầu từ `view.state.loadout`, chip chỉ sinh từ `view.words`); `shared/src/progression/citadel-rules.ts:170-175,215-216` (mọi id phải nằm trong `learnedWordIds`).
- Kịch bản lỗi: đã lưu vòng `[X]`, sau đó X không còn được tính là đã học (bộ từ cập nhật bỏ X, hoặc thẻ bị đưa về `new`). Panel không có chip X để bỏ chọn, nhưng X vẫn nằm trong bản nháp. Mọi lần "Lưu vòng từ" đều nhận 422 `invalid-loadout`, không có cách sửa. Đủ 4 ô thì còn không thêm được từ mới.
- Đề xuất (không đổi contract): client lấy bản nháp từ `saved.filter((id) => learnedIds.has(id))`, vẫn so `changed` với `saved` gốc để nút Lưu bật và xoá được id cũ. Server giữ nguyên kiểm chặt. Thêm test cho trường hợp này.

### M2. `Promise.all` trên cùng một client trong transaction
- Vị trí: `server/src/citadel/citadel-repository.ts:93-98` (`loadCitadel` chạy song song 4 truy vấn); khi gọi từ `updateCitadel` (`:175`, `:180`) thì `db` là `PoolClient` của transaction.
- Bằng chứng: `pg` 8.23.1 (`server/package.json`), `node_modules/pg/lib/client.js:779-780` phát `DeprecationWarning` "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0".
- Hậu quả: log production có cảnh báo; lên pg@9 thì lệnh ghi thành trì hỏng. PGlite trong test không phát hiện được.
- Đề xuất: trong `loadCitadel` dùng `await` lần lượt (4 truy vấn nhỏ, chênh lệch không đáng kể), hoặc gộp 4 bảng con thành một câu SELECT có `json_agg`.

### M3. Một request GET thành trì/bắt đầu trận chiếm gần hết pool 5 kết nối, và đọc không cùng snapshot
- Vị trí: `server/src/routes/citadel-routes.ts:140-144` (`readCitadel` + `readLearning` + `readStory` song song), `server/src/routes/battle-routes.ts:107-112`; `readCitadel` dùng pool nên 4 truy vấn con lấy 4 kết nối khác nhau; `server/src/db/pool.ts:34` (`max: 5`).
- Kịch bản lỗi: mỗi GET cần 6–7 lần mượn kết nối cùng lúc. Vài người chơi mở thành trì hoặc vào trận cùng lúc là phải xếp hàng chờ kết nối (`connectionTimeoutMillis` 10 s → 503). Đọc hero và bảng con ở các kết nối khác nhau có thể trả `rowVersion` cũ đi với bảng con mới. Trường hợp này chỉ dẫn tới 409 rồi tải lại, nhưng vẫn tốn một vòng gọi.
- Đề xuất: sửa cùng M2. `readCitadel` chạy tuần tự trên một kết nối, hoặc trong transaction chỉ đọc để có cùng snapshot.

### M4. Mọi lệnh ghi đều trả lại toàn bộ danh sách từ và nhật ký
- Vị trí: `server/src/routes/citadel-routes.ts:155,167` (mỗi lần ghi đọc lại tiến độ, bộ từ, story rồi trả `words` + `story`); contract `shared/src/citadel-contract.ts:65-66`.
- Kịch bản: người học khoảng 4000 từ thì mỗi cú bấm (rèn, mặc, nhận pha lê) trả vài trăm KB JSON. Trên 4G iPhone, phản hồi chậm và `JSON.parse` tốn thời gian.
- Đề xuất tối ưu (**đổi contract đã duyệt, cần đồng ý**): route ghi chỉ trả `state` + các số liệu tính ra (`learning`, `stage`, `heroStats`, `dailyCrystals`); `words` và `story` chỉ có ở `GET /citadel`, client giữ bản đã tải. Nếu không đổi contract thì tối thiểu bỏ đọc `story` ở route ghi.

### M5. Phát âm trên iOS có thể bị chặn vì `play()` chạy sau khi chờ mạng
- Vị trí: `client/src/ui/panels/library-panel.ts:66-72` (chờ `fetchPronunciation` xong mới gọi `playAudioBlob`), `client/src/audio/word-pronunciation.ts:33-40` (`new Audio(url).play()`).
- Kịch bản (giả định, plan cũng ghi là chưa kiểm): Safari iOS chỉ cho phát media khi gắn với thao tác chạm. Sau `await fetch` (tới 6 s), quyền đó có thể đã hết, `play()` bị từ chối và người chơi luôn thấy "Chưa phát âm được".
- Đề xuất: mở khoá ngay trong lúc chạm. Ví dụ dùng một `AudioContext` dùng chung, gọi `resume()` đồng bộ trong handler click (cùng cách `audio/battle-sounds.ts` đã làm), sau đó `decodeAudioData` blob và phát bằng `AudioBufferSourceNode`. Cách khác: dùng lại một `HTMLAudioElement` duy nhất, gọi `play()` đồng bộ trong click (src rỗng hoặc im lặng) rồi gán `src` khi có blob. Cần thử trên iPhone thật.

## Low

### L1. Lệnh bị luật từ chối ghi log hai lần
- `server/src/routes/citadel-routes.ts:160` log `HEROX_CITADEL_REJECTED` kèm `reason`, sau đó `server/src/app.ts:105` log thêm "Từ chối yêu cầu API". Không lộ dữ liệu cá nhân, chỉ thừa log. Đề xuất: giữ dòng có `reason`, hoặc cho error handler bỏ qua mã `citadelRejected`.

### L2. Một khung hình có thể mở hai overlay
- `client/src/scenes/world-scene.ts:238-239`: sau khi `checkBattleTriggers` gọi `openOverlay`, `checkBuildingDoors` vẫn chạy (`openOverlay` ở `:451-456` không bật cờ chặn, `scene.pause()` chỉ có hiệu lực từ khung sau). Nếu map đặt vùng trận chồng lên cửa công trình, cả BattleScene và CitadelScene cùng mở. Đề xuất: `openOverlay` đặt cờ (ví dụ `overlayOpen`), các hàm check thoát sớm khi cờ bật; xoá cờ trong `handleResume`.

### L3. Hình công trình theo `me` lúc boot
- `client/src/scenes/world-scene.ts:315-316` lấy `citadelStageFor` từ `me` trong registry. Panel thì dùng số mới từ `/citadel`, nên học thêm ở LingoBrain mà không tải lại trang thì panel ghi "Hồi sinh" trong khi hình vẫn "Đổ nát". Đề xuất: sau khi panel tải xong, cập nhật `learning` của `me` trong registry, hoặc vẽ lại công trình khi resume.

### L4. Dialog không đưa focus vào trong
- `client/src/ui/panels/citadel-panel.ts:66-71` có `aria-modal="true"` nhưng không `focus()` vào dialog hay nút đầu tiên, cũng không giữ focus trong dialog. Người dùng bàn phím hoặc trình đọc màn hình vẫn đứng ở canvas. Đề xuất: focus nút "Đóng" khi mở; khi đóng trả focus về canvas.

### L5. Bấm "Nghe" liên tục thì âm chồng nhau
- `client/src/ui/panels/library-panel.ts:62,66-72` không có cờ đang tải và không dừng âm trước. Mỗi lần bấm là một fetch + một `Audio` mới, chồng tiếng và tốn quota TTS của LingoBrain (`D:\project\eng\server\tts-routes.js:42-44`: 20 lần tạo mới/IP/phút). Đề xuất: bỏ qua lần bấm khi đang tải, dừng âm cũ trước khi phát âm mới.

### L6. Trận đang mở từ trước khi deploy sẽ lỗi 500 khi gửi kết quả
- `shared/src/combat/battle-state.ts:307` đọc `this.setup.skillTiers[skill]`. `findBattle` (`server/src/battle/battle-repository.ts:72`) ép kiểu JSON đã lưu mà không kiểm. Setup lưu trước thay đổi này không có `skillTiers` nên gặp `TypeError` → 500. Chỉ xảy ra trong 2 giờ quanh lần deploy và chỉ khi đã có DB thật chạy bản trận trước đó (giả định: chưa có, vì `server/src/battle/` chưa commit). Đề xuất nếu cần: lúc đọc thì `skillTiers ?? BASE_SKILL_TIERS`.

## Edge case từ scout
- Pha lê/ngày với `utcOffset` do client gửi: khoá ngày tăng đơn điệu (`citadel-rules.ts:191-193`), và khoá lớn nhất có thể có tại thời điểm t là ngày theo UTC+14. Vì vậy cả đời tài khoản chỉ lợi tối đa khoảng 1–2 lần nhận (đổi −12 rồi +14), không lặp lại được. Chấp nhận được, không tính là lỗi.
- Request ghi bị timeout phía client nhưng server đã commit: lần bấm sau nhận 409 rồi tải lại, nên không trừ tiền hai lần. `row_version` ở đây có tác dụng như khoá chống lặp. Câu báo "thay đổi ở nơi khác" hơi sai ngữ cảnh nhưng an toàn.
- Thắng trận làm tăng `row_version` (`battle-repository.ts:98-99`). Mỗi lần mở panel tạo gateway mới và tải lại (`citadel-scene.ts`), nên không gặp 409 giả.
- Thứ tự khoá: thành trì khoá `heroes` trước rồi mới tới bảng con; trận khoá `heroes` (`createBattle`) hoặc UPDATE `heroes` sau cùng trên các bảng khác (`settleBattle`). Không thấy vòng khoá gây deadlock.

## Đã xác minh
- SQL tham số hoá toàn bộ. Chỉ chèn chuỗi cố định `' FOR UPDATE'` vào câu lệnh (`citadel-repository.ts:52-53`), không chèn input. Lệnh ghi chỉ vào `herox.*`; `no-public-writes.test.ts` đạt.
- Transaction: luật từ chối thì ném `HttpError` 422 trong `change` → ROLLBACK (`pool.ts:105-114`). Lệch version → 409 trước khi áp luật (`citadel-repository.ts:177`). Test song song [200, 409] đạt (PGlite chạy tuần tự, nên chỉ chứng minh được nhánh so version).
- Kiểm input: `rowVersion` là số nguyên an toàn ≥ 1; id ≤ 64 ký tự; `skill` theo `SKILL_KINDS`; `utcOffset` trong [−720, 840]. Body ≤ 16 KB, chỉ nhận JSON. Luật kiểm id trong catalog, vòng từ ≤ 4 từ, không trùng, đều đã học.
- Log không có dữ liệu cá nhân: chỉ `code`, `action`, `reason`.
- Panel: không có `innerHTML` hay `insertAdjacentHTML` trong `client/src`; chữ gán bằng `textContent`, `title` gán qua property.
- iOS: ô tìm 16 px, `min-height` 44 px (`citadel-panel.css:263-264`); nút cao 44 px, chip 40 px; padding theo safe-area.
- Phaser: đóng panel thì `leave()` đặt `panel = null` trước `scene.stop()`, handler SHUTDOWN không đóng lại lần nữa. World `RESUME` gọi `resetKeys()`, UiScene `WAKE` thả joystick. Phím thêm với `enableCapture=false` nên ô tìm gõ được WASD/Space.
- TTS: chỉ `GET /api/tts?text=` kèm header `X-LB-TTS: 1`, hạn 6 s, xử lý 501 và lỗi đúng contract ở `D:\project\eng\server\tts-routes.js:69-76` (chỉ đọc, không sửa repo eng).
- Battle setup: `heroStatsWithGear` + `skillTiers` + `loadout` lọc theo bộ từ trận (`battle-preparation.ts:82-96`); hệ số bậc chiêu 1/1.15/1.3 (`skill-catalog.ts`).
- vitest 468/468, typecheck, lint: đạt.

## Giả định / chưa kiểm
- iOS có chặn `play()` sau khi chờ mạng không (M5): chưa thử trên máy thật.
- `FOR UPDATE` trên Postgres thật khi có tải song song: suy ra từ ngữ nghĩa READ COMMITTED, chưa chạy thử.
- Số từ đã học có thể giảm (M1), dựa trên định nghĩa "còn trong bộ và `state ≠ new`" ở `docs/system-architecture.md`. Chưa kiểm LingoBrain có cho reset thẻ về `new` không.
- Kích thước payload (M4) ước theo 5033 từ × khoảng 120 byte/từ, chưa đo thật.

## Việc nên làm (theo thứ tự)
1. H1 + M1: sửa Tháp Phép (giới hạn chip, có ô tìm, lọc id cũ khỏi bản nháp, cập nhật chip tại chỗ), thêm test.
2. M2 + M3: `loadCitadel` đọc tuần tự trên một kết nối/transaction.
3. M5: phát âm theo cách mở khoá ngay khi chạm; thử trên iPhone.
4. M4: hỏi duyệt việc bỏ `words`/`story` khỏi phản hồi lệnh ghi.
5. Các mục Low.

## Câu hỏi còn mở
- Có đồng ý đổi contract để route ghi không trả `words`/`story` (M4) không?
- Bộ từ LingoBrain có sẵn file âm thanh (`/api/audio-index`, 10066 file trong `eng/audio`). Dùng file này tốt hơn gọi TTS (không tốn quota, nhanh hơn), nhưng vượt ràng buộc "chỉ GET /api/tts". Có muốn nới ràng buộc này không?

Findings: critical=0 high=1 medium=5 low=6 new=12
Status: DONE_WITH_CONCERNS

## Xử lý sau review
- H1: Tháp Phép có ô tìm, tối đa 60 nút (từ đang chọn luôn đứng đầu), bấm chọn chỉ đổi nút đó và nút Lưu (`client/src/ui/panels/tower-panel.ts`, `loadoutCandidates`).
- M1: bản nháp bỏ từ không còn học (`initialLoadoutDraft`), nút Lưu so với bản đã lưu gốc nên xoá được từ cũ; có test.
- M2, M3: `loadCitadel` đọc lần lượt; `readCitadel` chạy trong transaction `REPEATABLE READ, READ ONLY` trên một kết nối.
- M4: chưa đổi, chờ duyệt đổi contract.
- M5, L5: phát âm qua Web Audio, mở khoá đồng bộ trong lần chạm (`audio/audio-unlock.ts`, dùng chung với âm thanh trận); bỏ qua lần bấm khi đang tải, dừng âm cũ; đóng AudioContext khi đóng panel. Chưa thử iPhone thật.
- L1: giữ nguyên, cùng mẫu với route trận; sửa phải đụng error handler chung.
- L2: cờ `overlayOpen` trong WorldScene, xoá khi resume.
- L3: panel báo giai đoạn mới qua registry, WorldScene đổi hình công trình khi resume.
- L4: focus nút "Đóng" khi mở panel. Chưa trả focus về canvas khi đóng (canvas không nhận focus; phím Phaser nghe ở `window`).
- L6: `findBattle` điền `BASE_SKILL_TIERS` khi setup cũ thiếu `skillTiers`; có test.
- Sau sửa: `npx vitest run` 44 file / 471 test, typecheck, lint, build đạt; kiểm lại trên Chromium (chọn vòng từ, lưu, Escape, hình công trình đổi, vùng trận ở Room A).
