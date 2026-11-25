---
title: "Phase 1: Vòng từ quanh hiệp sĩ và khoảnh khắc ra chiêu"
status: done
---

# Phase 1: Vòng từ quanh hiệp sĩ và khoảnh khắc ra chiêu

## Overview

Đổi vòng từ từ lưới DOM 2×3 ở dock đáy thành 6 nút xếp **vòng cung quanh sprite hiệp sĩ** (nửa dưới / hai bên, tránh vùng trên đầu nơi có combo và đường bay chiêu). Khi chạm một từ: các từ còn lại mờ/bắn ra, từ được chọn loé sáng, cả vòng tan (~200–300ms), **rồi** mới gọi `submit` để hiệp sĩ ra chiêu — tạo "khoảnh khắc" người chơi cảm nhận được.

Khung quá hẹp (`pixel-5` 393px, `iphone-12`) hoặc có từ quá dài làm nút vòng tràn mép / chồng HUD thì **rớt về lưới 2×3 cũ**.

## Quyết định đã chốt (bổ sung sau khi xác minh toạ độ + CSS)

- **Hệ toạ độ đã xác minh**: HUD overlay và Phaser scene **cùng khung logic 360×780** (`config/display.ts`). `ARENA_ORIGIN.y = (780 − 11×64)/2 = 38` → `HERO_FEET ≈ { x: 180, y: 426 }`, ngực hiệp sĩ ≈ y 370 trong khung overlay. Dùng chính phép chiếu `logic → %` của `floatText` (`battle-hud.ts:185`).
- **Bố cục vòng** (chốt với người dùng): **cung dưới + hai bên hiệp sĩ** (không bao lên trên đầu, nơi có chiêu bay). Tâm cung ở vị trí hiệp sĩ; 6 nút trải cung phía dưới/ngang.
- **Vị trí đề** (chốt): ở chế độ **ring**, thẻ đề chuyển **lên đỉnh khung** (dưới thẻ máu) để vòng không che đề. Ở chế độ **typing**, đề giữ ở đáy như cũ. → cần cho HUD đổi chỗ thẻ đề theo input mode.
- **Cơ chế "khoảnh khắc" không lệch replay** (chốt): dùng pattern `showcaseUntilMs`. `WordRing` có callback `onPickStart` (đồng bộ, ngay khi chạm) để scene đặt `ringDismissUntilMs = now + RING_DISMISS_MS` (đồng hồ trận + đề đứng y như `isShowcasing`); animation vòng tan chạy trong lúc đó; `onPick(wordId)` gọi **sau** animation để `submit`. Vậy input vào session đúng một lần, deadline đề không bị trễ.

## Bối cảnh kỹ thuật (đã xác minh)

- `client/src/ui/word-ring.ts:13` — `WordRing` hiện: 6 nút DOM lưới `battle-ring`, `onPick(wordId)` gọi ngay khi `pointerdown`/`click` detail=0. API public dùng bởi scene: `setOptions`, `setVisible`, `setEnabled`, `.element`.
- `client/src/scenes/battle-scene.ts:185` — `this.ring = new WordRing((wordId) => this.submit({ kind: 'ring', wordId }))`; `.element` append vào `hud.dockCenter` (`:194`). `applyInputMode` (`:227`) bật/tắt ring theo `inputMode`.
- `client/src/battle/battle-session.ts:52` — `submit` chỉ xếp `pendingInput`; event `cast` sinh ở `tick` kế (`:61`). Log ghi theo thời gian **trận** (`BattleFrameClock.advance(frameDeltaMs)`), **không** theo thời gian thực.
- `battle-scene.ts:149` `update` — khi `isShowcasing()` truyền delta `0` cho `session.tick`, đồng hồ trận đứng. Đây là cơ chế mẫu để dừng visual mà không lệch replay.
- `client/src/render/battle-actors.ts:20` — `HERO_FEET = { x: LOGICAL_WIDTH/2, y: ARENA_ORIGIN.y + 388 }` (toạ độ pixel logic Phaser). Hiệp sĩ sprite ~128px, ngực ở `CHEST_Y = -56` so với chân (`hero-battle-back.ts:14`).
- `client/src/ui/battle-hud.ts:120` — HUD overlay dùng khung logic `LOGICAL_WIDTH × LOGICAL_HEIGHT` (360×780), `--u` = px CSS cho 1 pixel logic; `floatText` (`:185`) đã chuyển toạ độ logic → `%` khung. Vòng từ định vị quanh hiệp sĩ phải dùng cùng phép chiếu này (toạ độ sprite hiệp sĩ → `%` overlay).
  - **Lưu ý toạ độ**: `HERO_FEET` tính theo `ARENA_ORIGIN`/display của Phaser; HUD tính theo `LOGICAL_WIDTH/HEIGHT` của `config/display`. Bước đầu phải **xác minh** hai hệ này có cùng gốc không (đọc `config/display.ts` và `battle-arena-layout.ts` `ARENA_ORIGIN`). Nếu khác, suy ra công thức chiếu HERO_FEET → % overlay; nếu không chiếu được chính xác, dùng hằng vị trí hiệp sĩ trên overlay (đo theo layout dock hiện tại) — ghi rõ giả định.
- `e2e/support/battle-flow.ts:66` — E2E ring định vị nút qua `page.locator('[data-word-id="${wordId}"]').tap()`. **Hợp đồng bắt buộc giữ**: mỗi nút từ vẫn phải có thuộc tính `data-word-id`, vẫn `tap`/`click` được, và vẫn chọn đúng từ đó.
- `shared` `RING_SIZE` = số nút (word-ring.ts:1 import). Giữ nguyên.

## Requirements

- [ ] 6 nút từ xếp vòng cung quanh vị trí hiệp sĩ trên overlay (nửa dưới + hai bên; không che thẻ đề, thẻ combo, đường bay chiêu phía trên đầu hiệp sĩ).
- [ ] Mỗi nút giữ `data-word-id`, vùng chạm ≥44px, chọn được bằng chuột, chạm, Enter/Space, VoiceOver (giữ cơ chế `pointerdown` + `click` detail=0 hiện có).
- [ ] Chạm một từ → animation "vòng tan": từ khác mờ/bắn ra + từ chọn loé, kéo dài khoảng cấu hình (hằng `RING_DISMISS_MS` ~220–300ms) → **sau đó** mới gọi `onPick(wordId)` (tức `submit`).
- [ ] Khoảng dừng "vòng tan" **không** đẩy delta vào `BattleSession`: hoặc đi qua cơ chế `isShowcasing()`-style ở scene, hoặc chỉ trễ lời gọi `submit` ở tầng view (session chưa nhận input nên đồng hồ trận vẫn chạy bình thường theo `update` — xác nhận điều này không gây lố deadline đề: nếu trễ làm quá hạn đề thì phải dừng đồng hồ đề trong lúc animation, giống showcase). **Quyết định cơ chế này là bước đầu của phase, ghi rõ vào plan trước khi code.**
- [ ] Chỉ áp cho kiểu **ring**; kiểu **typing** giữ nguyên phản hồi tức thì.
- [ ] Trong lúc "vòng tan", khoá nhận chạm tiếp (không chọn 2 từ, không double-submit).
- [ ] Khung hẹp/từ dài: rớt về lưới 2×3 cũ (class/biến thể CSS), nút vẫn ≥44px.

## Implementation Steps

1. **Xác minh hệ toạ độ** hiệp sĩ ↔ overlay (đọc `config/display.ts`, `battle-arena-layout.ts`). Chốt công thức/hằng vị trí tâm hiệp sĩ trên overlay (dạng `%` hoặc `--u`). Ghi giả định nếu không chiếu chính xác được.
2. **Chốt cơ chế "khoảnh khắc"** không lệch replay: ưu tiên phương án scene giữ nhịp (ring báo "đã chọn" cho scene; scene đặt một `ringDismissUntilMs` như `showcaseUntilMs`, dừng đồng hồ trận + đề trong lúc animation, hết thời gian thì mới `submit`). Viết quyết định vào phase này.
3. **`word-ring.ts`**: dựng vòng cung.
   - Thêm layout vòng: 6 nút định vị bằng góc cung quanh tâm hiệp sĩ (CSS `position:absolute` + biến `--ring-angle`/`--ring-radius`, hoặc tính toạ độ trong TS rồi set `left/top`). Giữ `createElement`/`panel-dom`.
   - Thêm chế độ lưới dự phòng (class `is-grid`) = bố cục 2×3 hiện tại; chọn chế độ qua media query theo chiều rộng hoặc đo độ dài nhãn dài nhất.
   - Thêm animation chọn: method `dismiss(wordId, onDone)` — từ chọn loé (class `is-picked`), từ khác `is-dismissed` (mờ/bắn ra), sau `RING_DISMISS_MS` gọi `onDone`. Trong lúc này set `enabled=false` để chặn chạm tiếp.
   - Đổi `pick`: thay vì gọi `onPick` ngay, gọi `dismiss(wordId, () => onPick(wordId))` — **chỉ khi ở chế độ ring có khoảnh khắc**; typing không qua đây.
   - `setOptions` reset trạng thái animation (xoá `is-picked`/`is-dismissed`) cho đề mới.
4. **`battle-hud.css`** (`client/src/ui/battle-hud.css`): style `.battle-ring` vòng cung (mỗi `.battle-ring-option` định vị tuyệt đối theo biến), `.battle-ring.is-grid` giữ lưới cũ, animation `is-picked`/`is-dismissed` (dùng `prefers-reduced-motion` để giảm chuyển động). Kiểm vùng chạm ≥44px (`--u` scale).
5. **`battle-scene.ts`**: nối cơ chế "khoảnh khắc" đã chốt ở bước 2 (nếu dùng scene-timer: thêm trạng thái tương tự `showcaseUntilMs`, cập nhật `update`/`refreshTimers` để đồng hồ trận + đề đứng trong lúc vòng tan; `WordRing` gọi callback khi animation xong thì mới `submit`). Giữ `applyInputMode`, `toggleInputMode` nguyên nghĩa.
6. **Test logic**: nếu `WordRing` có logic thuần test được (chọn chế độ grid/arc theo width, reset state), thêm test client thuần (không cần trình duyệt) như các test client hiện có.
7. Chạy `npm run typecheck`, `npm run lint`, `npm test`, rồi E2E ring.

## Todo

- [x] Xác minh hệ toạ độ hiệp sĩ ↔ overlay; chốt công thức/hằng tâm hiệp sĩ (cùng khung logic 360×780; RING_CENTER = HERO_FEET + offset).
- [x] Chốt + ghi cơ chế "khoảnh khắc" không lệch replay (ringDismissUntilMs theo pattern showcase; đồng hồ trận+đề đứng).
- [x] `word-ring.ts`: vòng cung + lưới dự phòng + `dismiss` animation + giữ `data-word-id`.
- [x] `battle-hud.css`: style vòng cung, grid fallback, animation chọn, reduced-motion, chạm ≥44px.
- [x] `battle-scene.ts`: nối khoảnh khắc (đồng hồ trận/đề đứng khi vòng tan), chỉ áp ring; đề lên đỉnh ở chế độ ring.
- [x] Test client thuần cho logic WordRing (chooseRingLayout + arcButtonPoints: `client/test/word-ring.test.ts`).
- [x] typecheck + lint + test xanh; E2E `battle.spec.ts` (gõ + vòng từ × pixel-5 + iphone-12) 4/4 xanh.

## Success Criteria

- Ring: 6 từ vòng cung quanh hiệp sĩ; chạm 1 từ → từ khác biến mất + từ chọn loé → vòng tan (~220–300ms) → hiệp sĩ ra chiêu; cảm nhận được "khoảnh khắc", không gấp đôi/bỏ lượt.
- Server replay không lệch: khoảng dừng vòng tan không đẩy delta vào `BattleSession` (hoặc dừng cả đồng hồ đề để không lố deadline).
- Khung hẹp nhất / từ dài: rớt về lưới 2×3; nút ≥44px; Enter/Space/VoiceOver chọn được; `data-word-id` còn nguyên nên E2E ring không sửa vẫn xanh.
- Typing không đổi hành vi.
- `npm run typecheck`, `npm run lint`, `npm test`, E2E `pixel-5`+`iphone-12` (case ring) xanh.

## Rủi ro & Rollback

- **Rủi ro toạ độ**: tâm hiệp sĩ trên overlay lệch với sprite Phaser → vòng không "ôm" đúng nhân vật. Giảm thiểu: xác minh ở bước 1, có hằng đo thủ công làm dự phòng.
- **Rủi ro replay**: trễ submit làm quá hạn đề → miss ngoài ý muốn. Giảm thiểu: dừng đồng hồ đề trong lúc vòng tan (cơ chế showcase-style).
- **Rollback**: `word-ring.ts` + `battle-hud.css` + phần nối ở `battle-scene.ts` là thay đổi khu trú; `git revert` phần phase 1 đưa về lưới chạm-tức-thì cũ, không ảnh hưởng logic trận.

## Sau review (g1:code-reviewer)

Đã sửa:
- **H1 rò rỉ setTimeout**: chuyển nhịp chờ vòng tan từ `window.setTimeout` trong `WordRing` sang `this.time.delayedCall` ở `battle-scene` (`holdThenCast`). Phaser tự huỷ delayedCall khi scene shutdown → không còn timer treo khi rời trận. `WordRing` không giữ timer, không cần `destroy()`.
- **M1 lệch đồng hồ**: dismiss nay dùng đồng hồ scene (cùng `ringDismissUntilMs`), hết lệch wall-clock vs Phaser khi tab nền.
- **M2 YAGNI**: bỏ `setFrameWidth`/`setCenter`/`frameWidth` và gate khung-hẹp (khung logic luôn 360×780, nhánh khung-hẹp là code chết). `chooseRingLayout` chỉ còn theo độ dài nhãn. Mục tiêu "khung hẹp hoặc từ dài → lưới" rút còn "từ dài → lưới" (đúng thực tế: khung hẹp không xảy ra ở khung logic cố định).
- **L1 đè nút phụ**: nâng `bottom` của lưới dự phòng lên 76u để chừa hàng nút phụ khi xuống 2 dòng trên màn hẹp.

Còn mở (ghi ở báo cáo): L2 — chưa có E2E cho nhánh lưới dự phòng ở chế độ vòng từ (cần từ >9 ký tự trong fixture).
