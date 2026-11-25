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
                                 ALL    schema herox (hero, citadel, inventory, story, word_misses, word_exposures, battles)
```

## Thành phần

| Thành phần | Mã nguồn | Trách nhiệm |
|---|---|---|
| Client | `client/src` | Scene Phaser, input bàn phím / cảm ứng, gọi API. Độ phân giải logic 640x360, pixel art, co giãn `FIT` |
| Server | `server/src` | `buildApp` (route, cấu hình Fastify) tách khỏi `server.ts` (listen, tắt mềm) để test bằng `inject` |
| Shared | `shared/src` | Hằng số đường dẫn (`APP_BASE_PATH`, `API_PREFIX`, `apiPath`), hợp đồng API và logic thuần dùng ở cả hai phía: trận đánh (`combat/`), cấp và mốc mở chương (`progression/`), chuỗi từ (`data/`) |

`@herox/shared` export điều kiện `source` trỏ vào mã TS: Vite, Vitest, `tsx` và `tsc --noEmit` đọc thẳng mã nguồn; bản build server dùng `shared/dist` (build trước theo thứ tự trong `npm run build`).

## Client

| Phần | Mã nguồn | Ghi chú |
|---|---|---|
| Hiển thị | `config/display.ts`, `index.html` | Khung thiết kế dọc 360×780, lưới 32px, `pixelArt`; khung nhìn nới rộng/cao theo tỉ lệ màn (`computeViewSize`, trần 480×1040) để canvas lấp hết, sân trận + HUD căn giữa khung thiết kế, nền sân tràn ra phần thừa; zoom làm tròn theo px thiết bị khi lấp ≥ 99,5%, ngược lại zoom lẻ; `#game-root` chừa safe-area iPhone |
| Scene | `scenes/boot-scene.ts` → `scenes/world-scene.ts` + `scenes/ui-scene.ts` | Boot nạp project LDtk, gọi `/me` bằng token `eng.auth.v1` (timeout 15 s); 401/không token → màn "Đăng nhập LingoBrain" (link `/`), lỗi mạng/dữ liệu → "Thử lại"; map hỏng → màn lỗi. World dựng level, hero, camera; qua cổng thì fade rồi `scene.restart({ levelId, spawnId })`. UiScene chạy song song, không restart khi đổi level |
| Map | `maps/ldtk-loader.ts` (thuần) + `maps/ldtk-tilemap-builder.ts` (Phaser) | Layer tile/auto-layer → `Tilemaps`, ô có nhiều tile chồng tách thành lớp con; IntGrid `Collision` (giá trị ≠ 0) → layer va chạm ẩn; layer tên `Overhead*` vẽ trên hero. Entity: `PlayerSpawn{spawnId}`, `Portal{targetLevel,targetSpawn}`, `Npc{dialogId}`, `Chest{itemId}`, `BattleTrigger{encounterId}`, `Building{buildingId}` (id phải có trong `BUILDING_IDS`, sai thì báo lỗi map), `Torch`; entity lạ bị bỏ qua. Chỉ nạp file `.ldtkl` và tileset của level đang vào; cache có namespace theo file map. Chưa hỗ trợ project nhiều world |
| Input | `input/` | Bàn phím WASD/mũi tên (không chặn phím ở mức trang) + joystick ảo động ở UiScene (nửa trái màn hình, chỉ khi `pointer: coarse`, giữ được ngón tay khi qua cổng); vector giới hạn độ lớn 1, hướng nhìn 4 hướng kiểu LPC |
| Trận | `scenes/battle-scene.ts`, `battle/` | Chạm `BattleTrigger` → World pause, UiScene sleep, mở BattleScene. `BattleSession` bọc `stepRecorded` + `BattleFrameClock`, giữ log; `BattleCueMapper` đổi sự kiện trận thành fx/âm thanh/chữ nổi (impact theo chiêu vừa tung, kết liễu dùng fx riêng + rung mạnh). Bắt đầu `POST /battles`, kết thúc gửi log `POST /battles/:id/result`; DEV không có `/me` thì chạy fixture offline |
| Nhập trận | `ui/typing-input.ts`, `ui/word-ring.ts`, `config/game-settings.ts` | Input DOM ẩn (tắt viết hoa/tự sửa, bỏ Enter khi IME đang ghép) hoặc vòng 6 ô 104×46. Mặc định theo thiết bị (`pointer: coarse` → vòng từ), người chơi đổi được; lưu `herox.settings.v1` |
| Hiệu ứng | `fx/fx-index.ts`, `fx/fx-player.ts`, `audio/battle-sounds.ts` | Atlas pixelfx ở `public/fx` + `fx-index.json` (fps, pivot, số khung); sprite dùng pool. World chỉ nạp fx di chuyển, trận nạp hết. Nguồn là `assets/fx/fx-manifest.json` (mỗi hiệu ứng có `element`); `node tools/render-fx.mjs` render lại atlas, gom lỗi và thoát mã 1 nếu có hiệu ứng không render được, tự hạ fps khi atlas vượt `maxAtlasSize` (2048). Tổng khoảng 27 MB nên không nạp một lần: `battle/battle-fx-assets.ts` có `battleBaseFxNames` (bộ nền, nạp lúc đi bản đồ và preload trận) và `deckFxNames` (FX của bộ chiêu trận, nạp sau khi có setup theo bậc tăng dần; atlas chưa sẵn thì cue lùi về FX bộ chiêu cũ; rời trận thì giải phóng atlas bộ chiêu). Âm thanh tổng hợp bằng Web Audio (không có file), tắt được |
| Kỹ năng di chuyển | `world/movement-skills.ts` | Lướt (Space, 180 ms, bất tử khi lướt) và thuấn bộ (E, xa nhất 96 px tới chỗ đứng được, qua tường mỏng). Mở theo số trạng từ + giới từ (`MOVEMENT_SKILLS` trong `shared`); nút cảm ứng ở UiScene. Trong trận, chiêu né hiện bằng hoạt ảnh lướt, không thêm input mới |
| Thành trì | `scenes/citadel-scene.ts`, `citadel/`, `ui/panels/` | Level `Lexhold`: công trình vẽ theo giai đoạn (`citadelStageFor(số từ đã học)`: đổ nát / đang dựng lại / hồi sinh), nền móng chắn đường trong lưới va chạm. Cửa ở cạnh dưới nền móng (`world/trigger-zones.ts`, kích hoạt lại chỉ sau khi đã rời vùng) → World pause, UiScene sleep, mở panel DOM phủ canvas (Lò Rèn, Tháp Phép, Xưởng May, Thư Viện); Escape hoặc "Đóng" trả lại bản đồ. `ApiCitadelGateway` giữ `rowVersion` lần đọc gần nhất, gặp 409 tự tải lại rồi báo. Thư viện phát âm qua `GET /api/tts` của LingoBrain (header `X-LB-TTS: 1`), 501 hoặc lỗi chỉ báo nhẹ. DEV không có `/me` thì `DevCitadelGateway` chạy luật cục bộ |
| Truyện | `story/`, `ui/hero-creation-form.ts`, `api/story-api.ts` | Boot: chưa có nhân vật → form tên + giới tính (`PUT /hero`), rồi tải `GET /story` vào `StoryJournal` (registry `story`) trước khi vào map. `WorldStory` điều phối trên bản đồ: lại gần `Npc` (vùng nới 12 px) mở hội thoại DOM (`DialogRunner`, chọn phiên bản theo mốc, chân dung, nút Bỏ qua, mốc loại chữ thánh có thử thách gõ hoặc chạm 3 lựa chọn); lại gần `Chest` nhặt thánh tích; `BattleTrigger` của trận truyện đã xong thì tắt, chưa tới lúc thì báo lý do; `Portal` khoá theo mốc hoặc số từ (chương sau). Hội thoại tự mở (mở đầu, kết chương) chạy sau khi vào level và khi về từ trận. Thắng trận truyện → BattleScene gọi `POST /story/beat`. `QuestTracker` (DOM, góc trên trái) hiện nhiệm vụ đang làm và thông báo ngắn. DEV không có `/me` thì `DevStoryBackend` chạy đúng luật mốc của server |
| Không khí | `render/golden-hour-atmosphere.ts` (preset `render/lighting-presets.ts`, giao diện `render/scene-atmosphere.ts`) | Ánh sáng theo preset nắng/hoàng hôn/trăng: dải màu chiều tà, tia nắng, bóng nhà, cửa sổ sáng, quầng ấm quanh hero/đuốc, vignette (WebGL); quality thấp tắt toàn bộ |

Hero: hitbox 20×12 ở chân trong khung 64×64, tốc độ 110 px/s, depth theo y chân để đi trước/sau NPC, rương.

## Logic trận

Máy trạng thái thuần trong `shared/src/combat/`, không phụ thuộc Phaser; client chạy để hiển thị, server chạy lại để kiểm thưởng.

- `createBattle(setup)` → trạng thái đầu + sự kiện; `step(state, input | null, dtMs)` → trạng thái mới + sự kiện (`enemySpawn`, `prompt`, `cast`, `comboUp`, `hit`, `miss`, `comboBreak`, `enemyAttack`, `statusApplied`, `statusTick`, `statusExpired`, `heal`, `enemyDefeated`, `victory`, `defeat`...; danh sách đủ ở `BattleEvent`). `cast` mang `moveId` và `comboTier`; `enemyAttack.prevented` cho biết quái mất lượt vì choáng hay đóng băng. Không đổi trạng thái truyền vào.
- Tất định: RNG mulberry32 lấy seed từ setup, trạng thái RNG nằm trong `BattleState`; các mốc thời gian (đề hết giờ, combo hết hạn) xử lý đúng thời điểm của chúng nên chia thời gian theo khung hình hay một bước lớn đều cho cùng kết quả (có test).
- Luật: gõ đúng 100%, gõ lệch 1 ký tự (từ ≥ 5 chữ) 80%, vòng từ 70%; từ đã thuộc +25%. Từ loại quyết định chiêu: động từ tấn công, danh từ khiên, tính từ làm yếu đòn kế của quái, trạng từ/giới từ né đòn kế. Combo nối khi hai chiêu đúng cách nhau dưới 4 s: 3 chiêu cùng từ loại ×1.3, trọn một chuỗi cụm (`data/word-chains.ts`) ×1.6 và kết liễu quái còn ≤ 25% máu. Quái có `fireShield` (trùm Quỷ Bù Nhìn): xuống dưới ngưỡng máu thì dựng khiên lửa (`enemyShieldUp`), dập combo đang có; sau đó chiêu tấn công chỉ trúng khi combo đạt `minCombo`, còn lại bị chặn (`shieldBlocked`, vẫn nối combo và vẫn áp hiệu ứng khiên/né/làm yếu). Sai hoặc hết giờ: đứt combo, quái đánh trả, từ vào danh sách sai. Từ yếu đôi khi sinh quái tinh anh (máu, thưởng ×2). Dưới 8 từ đã học → trận hướng dẫn với 8 từ cố định.
- Chiêu cụ thể: mỗi đòn đúng bốc một chiêu từ danh mục `shared/src/data/skill-moves.ts` theo loại chiêu (từ loại) và bậc combo 5 bậc (`combat/combo-tier.ts`, ngưỡng vào bậc 1, 2, 4, 6, 10 chiêu đúng liên tiếp; từ đã thuộc +1 bậc). Việc bốc (`combat/skill-move-picker.ts`) tránh lặp chiêu vừa dùng và dùng luồng RNG riêng tách từ seed (`initialMoveRngState`), nên thêm bớt chiêu không làm đổi dãy đề từ. Mỗi trận chỉ dùng bộ chiêu `buildBattleDeck(seed)`: 2 chiêu mỗi nhóm (loại + bậc), để máy yếu chỉ nạp ít atlas FX; client và server dựng ra cùng bộ.
- Hiệu ứng trạng thái (`combat/status-effects.ts`, áp trong `battle-state.ts`): đốt, độc, đóng băng, choáng, hút máu, hồi máu, tăng tốc, nguyền, có tác dụng thật. Xác suất và sức mạnh tăng theo bậc combo; hằng số ở file trên. Trùm miễn mất lượt (choáng không dính, đóng băng không chặn đòn). Khiên lửa chặn đốt nhưng không chặn độc. Sát thương theo lượt (đốt, độc) không tự hạ quái.
- Rủi ro khi deploy: luật bốc chiêu và trạng thái làm đổi kết quả chạy lại, trong khi chưa có `rulesVersion` trong setup. Trận đang dở lúc deploy bản luật mới sẽ bị `replayBattle` ở server từ chối.
- Client chạy trận bằng `stepRecorded(state, input, dtMs)`: tua thời gian, chỉ áp input qua đúng các luật server kiểm (bỏ input tới sớm hơn 150 ms sau khi đề hiện, ô không có trên vòng từ) và trả dòng log `{ atMs, kind: 'type', text } | { atMs, kind: 'ring', wordId }` cần gửi. Không tự ghép log từ `step`, nếu không input rơi đúng khung hình đề cũ hết giờ sẽ làm server từ chối cả trận. Thời gian trận là số nguyên ms (`step` làm tròn xuống); đổi delta khung hình lẻ qua `BattleFrameClock` để không trôi giờ.
- `replayBattle(setup, log)` từ chối log: input sớm hơn 150 ms, chọn ô không có trên vòng từ, sai thứ tự thời gian, input sau khi trận kết thúc, quá 30 phút hoặc quá 1000 input.

## Ranh giới dữ liệu

- HeroX chỉ `SELECT` (theo cột) trên `public.users`, `public.sessions`, `public.progress`, `public.words`, `public.deck_meta`; mọi lệnh ghi nằm ở schema `herox`. Test `server/src/no-public-writes.test.ts` quét mã nguồn server chặn lệnh ghi có đích ngoài `herox.*`.
- Không ghi ngược SRS của LingoBrain; từ trả lời sai lưu ở `herox.word_misses`. Sau mỗi trận đã chốt, lịch sử gặp từ (số lần ra đề, chuỗi trả lời đúng liên tiếp, lần gặp cuối) lưu ở `herox.word_exposures`, đọc lại khi dựng trận sau để giãn từ vừa gặp và gỡ nhóm Khó khi người chơi đã đúng liên tiếp.
- Xác thực (`server/src/auth/eng-session.ts`): token phiên của LingoBrain trong `localStorage['eng.auth.v1']`, gửi dạng `Authorization: Bearer`; server băm SHA-256 rồi tra `public.sessions` còn hạn 180 ngày. HeroX không gia hạn `last_used_at` (không có quyền ghi).
- Chỉ số học (`server/src/learning/learning-stats.ts`, thuần): đã học = từ còn trong bộ có `state ≠ new`, đã thuộc = `ivl ≥ 21`, tỉ lệ nhớ 30 ngày và chuỗi ngày tính như tab Tiến bộ của LingoBrain. Payload `progress.data` có `v` khác 1 → API trả 503 thay vì số sai. Test hợp đồng `contract-eng-payload.test.ts` so trực tiếp với code của repo `eng` khi repo nằm cạnh (`../eng` hoặc `ENG_REPO_DIR`).
- Trận (`server/src/routes/battle-routes.ts`): server dựng setup (bộ ≤ 40 từ đã học) rồi lưu ở `herox.battles` cùng giờ bắt đầu. Mỗi từ đã học được xếp một nhóm SRS (`new | due | hard | familiar | mastered`, xem `server/src/battle/word-tier-classifier.ts`) từ dữ liệu LingoBrain (`ef`, `due`, `reps`, `state`, `ivl`, lượt chấm cuối) và lịch sử gặp từ trong HeroX (`word_misses`, `word_exposures`). Bộ từ ưu tiên vòng từ, rồi chia slot còn lại theo hạn ngạch nhóm của loại trận (`WORD_MIX_QUOTAS` ở `shared/src/combat/word-pool.ts`: trận thường trải đều, trận trùm nặng nhóm Khó); trong mỗi nhóm ưu tiên từ lâu chưa gặp (giãn 12 giờ). Từ chuỗi cụm chỉ vào bộ nếu tự nó thuộc một nhóm, không kéo thêm. Luật ra đề trong trận (`pickPromptWord`) giữ nguyên; setup lưu lúc vào trận, nhưng trận đang dở lúc deploy đổi luật bốc chiêu/trạng thái vẫn bị chạy lại lệch (xem mục Logic trận). Mỗi người chơi chỉ có một trận mở: bắt đầu trận mới bỏ trận trước. Khi nhận kết quả, server chạy lại log bằng setup đã lưu; chỉ thắng mới cộng vàng, thua hay rời trận vẫn ghi `herox.word_misses`. Tất cả trong một transaction, khoá chính `herox.battle_rewards` chặn chốt hai lần.
- Thành trì (`server/src/routes/citadel-routes.ts`, `server/src/citadel/citadel-repository.ts`): luật thuần `applyCitadelAction` ở `shared/src/progression/citadel-rules.ts` (server và client dùng chung), server là nơi quyết định. Mỗi lệnh ghi chạy trong transaction: khoá dòng `herox.heroes` (`FOR UPDATE`), so `row_version` client gửi, áp luật, ghi `heroes`, `citadel_buildings` (cấp lò rèn), `skill_tiers`, `inventory`, `skill_loadout` rồi tăng `row_version`. Lệch version → 409, client tải lại. Pha lê mỗi ngày = chuỗi ngày học (tối đa 5) + thưởng tỉ lệ nhớ 30 ngày (≥ 70/80/90% → 1/2/3), ghi `heroes.last_crystal_claim_day`; ngày tính theo `utcOffset` và không nhận lại nếu ngày ghi đã ≥ hôm nay (đổi múi giờ lùi không nhận được hai lần). Trang bị cộng vào `BattleSetup.hero`, bậc chiêu vào `BattleSetup.skillTiers` (bậc 2 ×1.15, bậc 3 ×1.3 sức chiêu).
- Truyện (`server/src/routes/story-routes.ts`, `server/src/story/story-repository.ts`): nội dung chương là dữ liệu ở `shared/src/data/story/` (mốc, nhiệm vụ, hội thoại, khoá trận/cổng/công trình), luật thuần ở `shared/src/story/story-rules.ts`. Server ghi một mốc vào `herox.story_progress` chỉ khi đủ mốc trước và đủ bằng chứng: mốc trận cần dòng `herox.encounter_victories` (server tự ghi khi chốt một trận thắng, vì `herox.battles` bị xoá khi bắt đầu trận mới), mốc chữ thánh so đáp án đã chuẩn hoá. Ghi trong transaction khoá dòng `herox.heroes`; gửi lại mốc đã có thì trả 200, không đổi gì. Lò rèn (`forge` và rèn/nâng đồ) khoá tới mốc `smith-rescued`: route thành trì truyền `lockedBuildings` vào `applyCitadelAction`.
- Schema `herox`: migration SQL ở `server/src/db/migrations/`, chạy lúc khởi động (`migrate.ts`, khoá advisory, bảng `herox.schema_migrations`), thử lại có backoff; trong lúc chưa xong API trả 503, health check vẫn `ok`. Nhân vật của tài khoản LingoBrain đã xoá được dọn mỗi 24 giờ.

## API

| Route | Mô tả |
|---|---|
| `GET /herox/api/health` | Liveness, không cần DB |
| `GET /herox/api/ready` | Readiness: 200 khi migration xong, 503 khi đang khởi động |
| `GET /herox/api/me?utcOffset=<phút về phía đông UTC>` | Người dùng, chỉ số học (`LearningStats`), nhân vật (hoặc `null`). `utcOffset` bắt buộc (thiếu → 400), quyết định "hôm nay" khi tính chuỗi ngày; client gửi `-new Date().getTimezoneOffset()` |
| `PUT /herox/api/hero` | Tạo nhân vật lần đầu `{ name, gender }`; 201, đã có thì 409 |
| `POST /herox/api/battles` | Bắt đầu trận `{ encounterId }` → 201 `{ battleId, setup, tutorial }`. Trận không có → 400, chưa có nhân vật → 409 |
| `GET /herox/api/citadel?utcOffset=` | `CitadelResponse`: `state` (vàng, pha lê, cấp lò rèn, bậc chiêu, trang bị, vòng từ, ngoại trang, `rowVersion`), số liệu học, giai đoạn thành trì, chỉ số có trang bị, pha lê hôm nay, danh sách từ đã học, nhật ký truyện. Chưa có nhân vật → 409 |
| `POST /herox/api/citadel/upgrade?utcOffset=` | `{ rowVersion, target: { kind: 'forge' } \| { kind: 'skill', skill } \| { kind: 'item', itemId } }` (rèn mới hoặc nâng một cấp) |
| `POST /herox/api/citadel/equip?utcOffset=` | `{ rowVersion, itemId }` |
| `POST /herox/api/citadel/outfit?utcOffset=` | `{ rowVersion, outfitId }` (chỉ đổi hình, mở theo mốc từ) |
| `POST /herox/api/citadel/loadout?utcOffset=` | `{ rowVersion, wordIds }` (≤ 4 từ đã học, không trùng) |
| `POST /herox/api/citadel/daily-crystals?utcOffset=` | `{ rowVersion }`, tối đa một lần mỗi ngày theo giờ người chơi |
| `GET /herox/api/story` | `{ beats: [{ chapter, beat, completedAt }] }` theo thứ tự hoàn thành. Chưa có nhân vật → 409 |
| `POST /herox/api/story/beat` | `{ chapter, beat, answer? }` → `{ beats }`. Mốc không có hoặc body sai → 400; thiếu mốc trước, chưa thắng trận, sai chữ → 422 kèm lý do; chưa có nhân vật → 409; mốc đã có → 200 (gọi lặp an toàn) |
| `POST /herox/api/battles/:battleId/result` | Gửi log `{ entries, endedAtMs }` (body tối đa 96 KB) → `{ outcome: victory|defeat|fled, goldEarned, missedWordIds }`. Body sai dạng → 400; trận không có, của người khác, đã bị trận mới thay thế hoặc quá 2 giờ → 404; log bị chạy lại từ chối hoặc dài hơn thời gian thật kể từ lúc cấp trận → 422; đã chốt → 409 |

Mọi route thành trì trả `CitadelResponse` mới nhất; thiếu `utcOffset` hoặc body sai → 400, luật từ chối (thiếu vàng, thiếu từ, đã nhận pha lê…) → 422 kèm lý do, lệch `rowVersion` → 409.

Kiểu dữ liệu chung ở `shared/src/me-contract.ts`, `shared/src/combat/battle-contract.ts`, `shared/src/citadel-contract.ts` và `shared/src/story/story-contract.ts`. Cả hai route trận dùng POST để service worker không cache. Mọi lỗi trả `{ "error": "<câu thân thiện>" }`, `Cache-Control: no-store`. Rate limit 120 request/phút/IP và 60/phút/user, chung cho mọi route có xác thực (`server/src/http/api-guard.ts`); body tối đa 16 KB (trừ route kết quả trận), chỉ `application/json`. Log chỉ có `userId` và mã lỗi `HEROX_*` (log trận bị từ chối thêm mã vi phạm), không có token, username, nội dung tiến độ hay chữ người chơi gõ.

Pool Postgres (`server/src/db/pool.ts`): tối đa 5 kết nối, `statement_timeout` 5 s, keepalive, `application_name=herox`; DB không dùng được hoặc truy vấn quá hạn → 503. Cấu hình TLS bằng `PGSSL`/`PGSSLROOTCERT`, không đặt `sslmode` trong `DATABASE_URL` (tham số trong URL ghi đè). Role `herox_app` chỉ có SELECT theo cột trên bảng LingoBrain (không đọc `users.pass_hash`) và sở hữu schema `herox`; script cấp quyền do người vận hành chạy.

## Mạng và proxy

- Dev: Vite 5180 proxy `/herox/api` sang server 3180.
- Production: reverse proxy của LingoBrain chuyển `/herox/*` vào container HeroX; đặt `TRUST_PROXY_HOPS=1` để Fastify lấy đúng IP client từ `X-Forwarded-For`.
