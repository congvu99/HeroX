---
title: "Phase 4: Màn trận hiển thị chiêu và trạng thái"
status: done
priority: P1
effort: "4h"
dependencies: [2, 3]
---

# Phase 4: Màn trận hiển thị chiêu và trạng thái

## Overview

Client vẽ chiêu theo `moveId`, hiện tên chiêu và trạng thái trên nhân vật, và chỉ nạp FX của bộ chiêu trong trận.

## Implementation Steps

1. **Nạp FX:**
   - `battle-scene.ts` `preload` gọi `queueFxAssets(scene, [...SYSTEM_FX, ...deckFxNames(setup)])`.
   - Thiếu atlas thì lùi về FX cũ của loại chiêu, giống `skillVariantFor`, và không làm vỡ trận.
2. **Cue:**
   - `BattleCueMapper.castCues` lấy chiêu từ `moveId`. Bỏ `escalate()` cũ vì bậc combo đã chọn chiêu.
   - Giữ quy tắc đặt chỗ (`castFxPlacement`) và projectile theo hệ: thêm tone `fire|ice|lightning|nature|shadow|holy|arcane`
     vào `battle-projectile.ts`.
3. **Độ hoành tráng theo bậc:**
   - Bậc 4–5 thêm rung mạnh và hitstop ngắn.
   - Bậc 5 có chữ nổi tên chiêu lớn và vầng sáng `holy-sunburst`/`arcane-magic-circle-cast` dưới chân.
   - `SHOWCASE_MS` tính theo bậc (bậc 5 dài hơn ~400 ms).
4. **Trạng thái:**
   - FX lặp `status-*` gắn trên quái hoặc hiệp sĩ, hết hạn thì tắt.
   - Chữ nổi cho lúc dính trạng thái ("Đóng băng!"), tick ("-12 độc"), và hồi máu ("+15").
   - `enemyAttack.prevented` hiện "Choáng: mất lượt".
5. **Âm thanh:** dùng lại `battle-sounds.ts`. Chỉ thêm khoá mới nếu có âm sẵn trong repo; không có thì dùng `cast`/`heavyHit`.
6. Thanh combo (HUD) hiện bậc 1–5 bằng màu. Tìm thành phần thẻ combo hiện có trước khi viết mới.

## Files

- Sửa:
  - `client/src/battle/battle-cues.ts` và test
  - `client/src/scenes/battle-scene.ts`
  - `client/src/render/battle-projectile.ts`
  - `client/src/render/enemy-battle-effects.ts`
  - `client/src/audio/battle-sounds.ts`
- `client/src/battle/dev-battle-fixture.ts`: thêm chế độ xem thử từng chiêu theo bậc, để soát mắt nhanh.

## Todo

- [x] Nạp FX theo bộ chiêu, có lùi về FX cũ khi thiếu atlas
- [x] Cue theo `moveId`, projectile theo hệ
- [x] Bậc 4–5 hoành tráng hơn
- [x] Hiển thị trạng thái và chữ nổi
- [x] Test `battle-cues` cho từng loại sự kiện mới

## Success Criteria

Chụp màn dev fixture mỗi bậc 1–5 cho 4 loại chiêu. Hình không che mặt hiệp sĩ, và thấy rõ bậc cao hoành tráng hơn.

## Kết quả (2026-11-25)

- `battle-cues.ts`: cue theo `moveId` + `comboTier`; FX chưa tải thì lùi về biến thể cũ (`isFxReady`). Bậc 3 hiện tên
  chiêu, bậc 4 hào quang + rung mạnh, bậc 5 hitstop. Luồng phép màu theo `element`. Cue cho mọi sự kiện trạng thái.
- `battle-fx-assets.ts`: bộ nền nạp sẵn (bản đồ và preload trận); FX bộ chiêu nạp nền sau khi có setup, rời trận thì gỡ.
- Tỉ lệ: FX khung to của pixelfx (tới 372 px) bị giới hạn cạnh dài 240 px ở hiệp sĩ, 280 px ở quái (`fitFxScale`),
  so với hiệp sĩ 128 px, quái 128–192 px, sân 360 px.
- Không có thanh combo riêng trên HUD; bậc hiện bằng chữ nổi "Bậc N" khi lên bậc.
- `?battleSeed=<số>` ở trận thử dev để xem các bộ chiêu khác nhau.
