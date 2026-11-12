# Review: màn trận, skill catalog, pixelfx, kỹ năng di chuyển

## Phạm vi
- File: các file trong task (shared skill-catalog, client api/battle/fx/ui/audio/world/scenes, tools/render-fx.mjs, assets/fx, test, config).
- Bối cảnh đã đọc: `shared/src/combat/battle-state.ts`, `battle-replay.ts`, `battle-frame-clock.ts`, `battle-contract.ts`.
- Không chạy lại typecheck/lint/test (caller đã xác minh). Review đọc code, không sửa source.

## Đánh giá chung
Phần replay contract đúng: `BattleSession` xếp input, `stepRecorded` advance rồi mới kiểm `checkInput` giống hệt `replayBattle`, input bị loại không vào log → log client luôn qua replay. Không thấy double-submit trong một trận. Lỗi chính nằm ở **async sau `await` trong `BattleScene`**: scene Phaser là một instance dùng lại, nên guard `scene.isActive()` không phân biệt trận cũ và trận mới.

## Critical
Không có.

## High

### H1. Promise của trận cũ ghi đè trận mới (đã xác minh bằng code)
- `client/src/scenes/battle-scene.ts:223-227` (`beginBattle`), `:342-343` (`finishBattle`), `:377-378` (`flee`): sau `await` chỉ kiểm `this.scene.isActive()`.
- Phaser tạo **một** instance `BattleScene` (`main.ts:269`), `scene.launch` chạy lại cùng instance; `init` (`:86-92`) reset `session/online/ended` nhưng không huỷ request đang chờ.
- Kịch bản (vùng trận bật lại ngay khi hero rời vùng rồi quay vào, `world-scene.ts:406-421`; request có thể treo tới 15 s):
  1. Bấm "Rời trận" lúc đang "Đang vào trận…" → `session === null` → thoát ngay (`:370-372`). Vào lại trận khác trước khi `startBattle` cũ trả về → promise cũ thấy scene active → `startSession(setupCũ, battleIdCũ)` đè trận mới. Server bỏ trận chưa chốt khi bắt đầu trận mới → kết quả gửi về `battleIdCũ` bị từ chối, mất thưởng.
  2. Thắng → "Đang ghi kết quả…" → bấm "Rời trận" (`ended` = true → thoát ngay) → vào trận mới → submit cũ trả về → `showEnd(...)` trên trận mới: đặt `ended = true`, trận mới đứng hình, không bao giờ gửi kết quả.
  3. "Rời trận" giữa trận, bấm lần 2 để thoát ngay → vào trận mới → `flee` cũ trả về → `exitBattle()` dừng trận mới.
- Fix: thêm bộ đếm thế hệ trận (tăng trong `init`, capture trước `await`, so sánh sau `await`) hoặc `AbortController` tạo trong `create`, `abort()` trong `cleanup` và truyền `signal` vào `startBattle/submitBattleResult` (gộp với timeout bằng `AbortSignal.any`).
  ```ts
  const generation = ++this.battleGeneration; // trong beginBattle/finishBattle/flee
  const result = await startBattle(...);
  if (generation !== this.battleGeneration || !this.scene.isActive()) return;
  ```

## Medium

### M1. Setup lỗi từ server làm treo màn trận (đã xác minh)
- `battle-api.ts:33-39` chỉ kiểm `words`/`enemies` là mảng. `startSession` (`battle-scene.ts:236-241`) → `new BattleSession` → `createBattle` ném `InvalidBattleSetupError` (`battle-state.ts:141-147`) khi mảng rỗng / `promptTimeMs` sai → rejection trong `void this.beginBattle()` không ai bắt; màn kẹt ở "Đang vào trận…", không có nút "Về bản đồ". Lỗi tương tự trong `update` (từ đề trỏ sai id) sẽ ném mỗi khung.
- Fix: bọc `startSession` bằng `try/catch` `InvalidBattleSetupError` → `showEnd(UNAVAILABLE_MESSAGE)`.

### M2. Gửi kết quả lỗi mạng thì không có cách gửi lại (đã xác minh)
- `battle-scene.ts:344-347`: `failed` → chỉ hiện "Chưa ghi được kết quả" + nút về bản đồ. Mất mạng / timeout 15 s trên di động = mất vàng và mất ghi `word_misses` của trận thắng, dù log hợp lệ.
- Fix: nút "Thử lại" gọi lại `submitBattleResult` với cùng `session.resultRequest()` (log bất biến sau khi trận xong). Cần xác nhận server xử lý submit lặp idempotent.

### M3. Phím/joystick có thể bị "kẹt" sau khi thoát trận (có thể xảy ra, chưa kiểm)
- `world-scene.ts:418-420`: `scene.pause()` world + `scene.sleep(ui)` đúng lúc người chơi đang giữ phím/joystick đi vào vùng trận. Keyboard plugin của scene đang pause và joystick của `UiScene` đang ngủ có thể không nhận `keyup`/`pointerup` → về bản đồ hero tự đi tiếp.
- Fix: khi `RESUME` gọi `this.input.keyboard?.resetKeys()`; khi `WAKE` của `UiScene` reset joystick. Cần thử trên trình duyệt để xác nhận.

### M4. Enter bị nuốt nhưng ô gõ vẫn bị xoá (đã xác minh)
- `battle-scene.ts:137-141`: `submit` rồi `typing.clear()` ngay. `stepRecorded` bỏ input khi `isInputTooFast` (`battle-replay.ts:40,62`), cụ thể khi đề cũ hết giờ trong đúng khung đó (đề mới `shownAtMs` = deadline). Người chơi gõ đúng sát giờ: chữ biến mất, không có phản hồi.
- Fix: chỉ xoá khi input được nhận (vd `BattleSession.submit` trả về/expose `lastInputAccepted` sau tick), hoặc hiện float "Chậm một nhịp" khi bị bỏ.

## Low
- L1. `battle-scene.ts:190-195` + `:355-360`: đổi kiểu nhập sau khi trận kết thúc gọi `applyInputMode` → vòng từ / dòng gõ hiện lại trên màn kết thúc (không gửi được vì `submit` kiểm `ended`, chỉ là lỗi hiển thị).
- L2. `word-ring.ts:137-139,160-169`: `press` không kiểm vòng có đang hiện hay không; nếu Phaser vẫn hit-test con của container ẩn thì chạm vùng vòng ở chế độ gõ sẽ gửi input ring. Chưa kiểm hành vi Phaser 4; thêm cờ `visible` vào guard cho chắc.
- L3. `battle-scene.ts:246` + `:261`: tween mờ quái chết bị `killTweensOf` ngay ở `enemySpawn` cùng khung (quái kế ra liền) → hiệu ứng mờ không bao giờ chạy, trừ quái cuối.
- L4. `battle-api.ts:41-45`: `isBattleResultResponse` không kiểm `missedWordIds`, nhưng `battle-scene.ts:351` đọc `.length`. Server hiện luôn trả (`server/src/routes/battle-routes.ts:170`), nhưng guard nên khớp contract.
- L5. `battle-sounds.ts:227,241`: `void context.resume()/close()` → reject (hiếm) thành unhandled rejection; thêm `.catch(() => undefined)`.
- L6. GC mỗi khung: `battle-session.ts:445` tạo mảng rỗng mới mỗi tick; `stepRecorded` luôn spread `{ ...advanced, logEntry: null }` + `step` dựng `BattleDraft` và state mới mỗi khung. Đã đo 0 GC > 8 ms nên chỉ ghi nhận; có thể dùng hằng `NO_EVENTS` và bỏ qua `step` khi `dt === 0`.
- L7. Magic string trùng: `skill-catalog.ts:123,130-138` ghi `'dash-dust'`, `'blink-out'` thay vì `SYSTEM_FX.dashDust/blinkOut`; `battle-cues.ts:38` so sánh dựa vào hai chuỗi này khớp nhau → dùng hằng.
- L8. Magic number vị trí/kích thước: `battle-scene.ts:128` (520, 70), `:149` (14, 50), `:228` (150), `:363` (70); `battle-hud.ts:121,123,125` (26, 10, 180); `word-ring.ts:145` (0.5); `world-scene.ts:366` (0.6).
- L9. Comment nhắc plan: `battle-hud.ts:63` "(phase nội dung)" → bỏ, ghi lý do thay vì tham chiếu phase.
- L10. Mô tả chiêu hứa cơ chế không có: `skill-catalog.ts:90` ("đòn quỷ dội ngược"), `:129` ("hiện ra cạnh quỷ"); `battle-state.ts` không có phản đòn. Người chơi đọc sẽ hiểu sai.
- L11. `movement-skills.ts:76` `isInvulnerable` chỉ dùng trong test (YAGNI, chưa có quái trên bản đồ).
- L12. DRY: `HTTP_UNAUTHORIZED` và timeout 15 s khai báo lặp ở `battle-api.ts:24-26` và `me-api.ts:7-9`; nên đưa vào `api-request.ts` cùng `readErrorMessage`.
- L13. `fx-player.ts:8-12`: prefix `'fx'` khớp mọi key bắt đầu "fx" (vd "fxmap"); nên dùng `'fx:'` + so khớp đúng `FX_INDEX_CACHE_KEY`.
- L14. HMR (chỉ dev): `game.destroy` không phát `SHUTDOWN` nên ô `<input>` ẩn và `AudioContext` không được dọn (`battle-scene.ts:111,174-179`). Nghe thêm `Phaser.Scenes.Events.DESTROY`.

## Edge case từ scout
- Re-entry vùng trận rất nhanh (H1) vì `battleTriggersArmed` bật lại ngay khi rời vùng.
- Đề hết giờ cùng khung với Enter → input bị bỏ (M4), log vẫn đúng.
- Rời trận lúc trận vừa xong: `ended` được set đồng bộ trong `update`, không double-submit (đã xác minh `:123,330,370`).
- Rời trận lúc chờ `startBattle`: không gửi gì, server tự bỏ trận (đúng thiết kế) nhưng dính H1.

## Đã xác minh / Chưa kiểm tra
- Đã xác minh (đọc code): thứ tự submit→tick→`stepRecorded` khớp `replayBattle`; `maxLength` ô gõ = `MAX_TYPED_ANSWER_LENGTH`; cleanup gỡ listener `POINTER_DOWN`/`ANY_KEY_DOWN`, xoá `<input>`, đóng `AudioContext` khi `SHUTDOWN`; pool sprite fx/floatText/ghost không tạo đối tượng mới mỗi khung; key bàn phím world dùng `enableCapture = false` nên ô gõ nhận đủ phím; token chỉ nằm trong header `Authorization`, không có `console.*` trong `client/src`; không có định danh nửa Anh nửa Việt.
- Chưa kiểm: M3 và L2 (hành vi Phaser 4 khi pause/ẩn container); "me-api refactor không đổi hành vi" không so được vì `client/src/api/` chưa từng commit (untracked, không có baseline trong git); không kiểm bundle prod có loại `dev-battle-fixture` hay không (hook chặn đọc `dist`).

## Hành động đề xuất
1. H1: bộ đếm thế hệ hoặc `AbortController` cho mọi `await` trong `BattleScene`.
2. M1: bắt `InvalidBattleSetupError` khi dựng phiên.
3. M2: nút "Thử lại" gửi kết quả.
4. M3: reset phím/joystick khi world resume, thử trên trình duyệt.
5. M4: chỉ xoá ô gõ khi input được nhận.
6. Low: dọn magic string/number, comment phase, mô tả chiêu.

## Số liệu
- Type coverage: strict TS, không thấy `any`/suppress trong phạm vi.
- Test: 402 test pass (theo caller); chưa có test cho luồng async của `BattleScene` (Phaser, không test được trong Node) → H1 không bị test bắt.
- Lint: 0 (theo caller).

## Câu hỏi còn mở
- Server có xử lý submit kết quả lặp lại (retry) idempotent không? Ảnh hưởng cách làm M2.
- Server bỏ trận cũ khi `POST /battles` mới đến: nếu hai request đến lệch thứ tự (H1 kịch bản 1), trận nào được giữ?

Findings: critical=0 high=1 medium=4 low=14 new=19
Status: DONE_WITH_CONCERNS
