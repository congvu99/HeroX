---
title: "Phase 2: Đặt lại vị trí và hoà sáng FX"
status: done
---

# Phase 2: Đặt lại vị trí và hoà sáng FX

## Overview

FX chiêu **phía hiệp sĩ** (castFx của attack/guard/empower, và các SYSTEM_FX như levelUp/comboUp phát ở hero) hiện phát tại `bodyOf('hero')` = chân + offset `-44`, depth `FX_DEPTH=20` > `ACTOR_DEPTH=10`, không blend ADD → dán đè giữa thân nhân vật, che mặt, trông không thật.

Phase này **chỉ sửa FX phía hiệp sĩ** (theo chốt với người dùng), giữ nguyên FX trúng đòn ở quái:
- Hào quang guard/empower đặt **dưới chân / sau sprite** (depth < actor) để hiệp sĩ đứng trong vầng sáng.
- Kiếm khí attack đặt **phía trước** hiệp sĩ, hướng bay lên quái.
- Bật **blend ADD** cho FX sáng để hoà vào cảnh thay vì che mặt.

Pattern đã có sẵn trong repo và trông "thật": `HeroBackEffects` (`hero-battle-back.ts:49`) đặt hào quang `BlendModes.ADD`, chèn **dưới** sprite qua `root.addAt`. Phase này mở rộng cùng tư tưởng sang FX pixelfx.

## Bối cảnh kỹ thuật (đã xác minh)

- `client/src/scenes/battle-scene.ts:363` `playCue` → case `'fx'`: `this.fx.play(cue.fx, at.x, at.y, { scale, depth: FX_DEPTH, timeScale })` với `at = bodyOf(cue.target)` (`:352` = feet + `FX_BODY_OFFSET_Y = -44`).
- `FX_DEPTH = 20` (`:61`), `ACTOR_DEPTH = 10` (`battle-actors.ts:30`). FX luôn vẽ **trên** actor.
- `client/src/fx/fx-player.ts:83` `play(name, x, y, options)` — options có `scale/depth/flipX/angle/timeScale`, **chưa có `blendMode`**. Sprite set origin theo pivot pixelfx (chính diện). `acquire()` dùng pool; sprite tái dùng nên khi thêm blendMode phải **reset về NORMAL** ở mỗi lần `play` (nếu không, sprite pool giữ ADD từ lần trước).
- `client/src/battle/battle-cues.ts` — phân loại FX theo target:
  - castFx phát `target:'hero'` (`:141`): `{ type:'fx', fx: variant.castFx, target:'hero' }`.
  - guard impactFx cũng phát `target:'hero'` (`:149`, khiên hiện quanh hiệp sĩ).
  - levelUp (`:145`), comboUp (`:95`), dashDust/blinkIn (evade) phát ở hero.
  - impactFx trúng đòn phát `target:'enemy'` trong `hitCues` (`:163`). **Giữ nguyên.**
- `SYSTEM_FX` (`shared/src/data/skill-catalog.ts:32`): shieldBlock, enemySpawn, enemyDeath, enemyStrike, finisher, comboUp, levelUp, blinkIn/Out, dashDust. Cần lọc cái nào phát ở hero để đặt lại.
- `SkillVariant` (`skill-catalog.ts:53`): `castFx`, `impactFx`, `fxScale`. attack castFx=`attack-cast-*`, guard=`guard-cast-*`, empower=`empower-cast-*`.
- `HERO_FEET`/`ENEMY_FEET` (`battle-actors.ts:20-21`): hiệp sĩ dưới, quái trên, cùng `x = LOGICAL_WIDTH/2`. Kiếm khí "phía trước, bay lên quái" = về phía y giảm (lên trên).

## Cách tiếp cận

FX phía hiệp sĩ có hai nhóm vị trí/độ sâu khác nhau:

1. **Hào quang bao quanh người** (guard impactFx = khiên, empower castFx = tụ phép, levelUp, comboUp): đặt ở **thân/chân** hiệp sĩ, depth **dưới** sprite (actor), blend ADD → hiệp sĩ đứng trong/ trước vầng sáng.
2. **Chiêu phóng đi** (attack castFx = kiếm khí, empower castFx nếu là tia bắn): đặt **phía trước** hiệp sĩ (y thấp hơn chân một chút, hướng lên quái), depth có thể trên sprite nhưng blend ADD để không là mảng đặc che người.

Vì `playCue` nhận `cue` đã có `target`, cách sạch là **mở rộng cue `fx`** để mang thêm thông tin trình bày thay vì nhét `if (fx === ...)` vào scene (giữ quy tắc không phá base, mục 5 senior-standard). Thêm trường tuỳ chọn vào cue `fx`:
- `anchor?: 'body' | 'under' | 'front'` — chỗ đặt (mặc định `body` = hành vi cũ ở quái/mặc định).
- `blend?: 'normal' | 'add'` — blend mode (mặc định `normal`).
- `depthBias?: number` hoặc suy ra depth từ `anchor` (`under` → dưới actor).

`BattleCueMapper` set các trường này cho FX phía hiệp sĩ; scene `playCue` đọc chúng để chọn vị trí/depth/blend. FX ở quái không set → giữ hành vi cũ.

## Requirements

- [ ] `FxPlayer.play` nhận thêm option `blendMode` (ADD/NORMAL); sprite pool reset blend về NORMAL mỗi lần play để không rò ADD giữa các lần.
- [ ] Cue `fx` mang thêm thông tin trình bày (anchor/blend/depth) để scene đặt FX đúng chỗ **không cần** `if (fx === tên)` trong scene.
- [ ] Hào quang guard/empower/levelUp/comboUp phía hiệp sĩ: đặt ở thân/chân, depth **dưới** sprite hiệp sĩ (nhân vật đứng trong vầng sáng, không che mặt), blend ADD.
- [ ] Kiếm khí attack: đặt phía trước hiệp sĩ, hướng lên quái, blend ADD; không là mảng đặc che người.
- [ ] FX trúng đòn ở **quái** giữ nguyên vị trí/scale/depth hiện tại.
- [ ] Giữ `FX_TIME_SCALE`, pool, và mọi hành vi play khác không đổi.
- [ ] Test cue mapper hiện có vẫn xanh (và mở rộng test cho các trường trình bày mới nếu mapper được test).

## Implementation Steps

1. **`fx-player.ts`**: thêm `blendMode?: Phaser.BlendModes` (hoặc `'add'|'normal'`) vào `FxPlayOptions`; trong `play`, set `sprite.setBlendMode(options.blendMode ?? Phaser.BlendModes.NORMAL)` — luôn set để reset pool. Không đổi chữ ký call cũ (tuỳ chọn, mặc định NORMAL = hành vi cũ).
2. **`battle-cues.ts`**: mở rộng type cue `fx` với `anchor?`/`blend?` (và depth nếu cần). Gán cho FX phía hiệp sĩ:
   - attack castFx → `anchor:'front'`, `blend:'add'`.
   - guard castFx + guard impactFx (khiên) → `anchor:'body'|'under'`, `blend:'add'`.
   - empower castFx (tụ phép) → `anchor:'under'`, `blend:'add'`; projectile curse giữ nguyên.
   - levelUp/comboUp (hào quang hero) → `anchor:'under'`, `blend:'add'`.
   - evade dashDust/blinkIn → giữ hoặc `blend:'add'` nếu là loé sáng.
   - FX ở quái (impactFx trong `hitCues`, enemySpawn/Death/Strike/shieldBlock ở enemy) **không set** các trường mới → mặc định.
3. **`battle-scene.ts`** `playCue` case `'fx'`: đọc `anchor`/`blend` của cue. Tính `at`:
   - `body` (mặc định): `bodyOf(cue.target)` như cũ.
   - `under`: điểm ở chân/thân hiệp sĩ; depth = `ACTOR_DEPTH - 1` (dưới sprite).
   - `front`: điểm trước hiệp sĩ hướng quái (y giảm); depth giữ `FX_DEPTH`.
   - map `blend:'add'` → `Phaser.BlendModes.ADD`. Thêm hằng offset mới (ví dụ `FX_UNDER_OFFSET_Y`, `FX_FRONT_OFFSET_Y`) thay vì magic number.
4. Chạy `npm test` (cue mapper), `npm run typecheck`, `npm run lint`. Kiểm bằng mắt trong dev (`npm run dev`, vào trận thử): hào quang không che mặt, kiếm khí bay lên quái, FX quái không đổi. Dùng `verify-app` nếu có.

## Todo

- [ ] `fx-player.ts`: thêm `blendMode`, reset pool mỗi lần play.
- [ ] `battle-cues.ts`: mở rộng cue `fx` (anchor/blend), gán cho FX phía hiệp sĩ; không đụng FX quái.
- [ ] `battle-scene.ts` `playCue`: đọc anchor/blend, tính vị trí + depth + blend, thêm hằng offset.
- [ ] typecheck + lint + test (cue mapper) xanh; kiểm mắt trong dev.

## Success Criteria

- Hào quang guard/empower/levelUp/comboUp nằm sau/dưới sprite hiệp sĩ — nhân vật đứng trong vầng sáng, không che mặt.
- Kiếm khí attack ở phía trước, bay lên quái; blend ADD, không là mảng đặc che người.
- FX trúng đòn ở quái không đổi.
- Không `if (fx === tên)` rải trong scene; scene đọc thuộc tính trình bày của cue (giữ base sạch).
- `npm run typecheck`, `npm run lint`, `npm test` (cue mapper + combat ≥90%) xanh.

## Rủi ro & Rollback

- **Rủi ro pool rò blend**: quên reset blend → FX sau dính ADD. Giảm thiểu: luôn `setBlendMode` ở `play` (bước 1), test cả FX quái sau khi FX hero ADD.
- **Rủi ro depth**: đặt hào quang dưới actor mà sân/nền cũng ở depth thấp → hào quang bị nền che. Kiểm `BattleArena` depth; nếu đụng, dùng depth giữa nền và actor.
- **Rollback**: ba thay đổi khu trú; `git revert` phase 2 đưa FX về cách phát cũ (dán body, depth 20) mà không ảnh hưởng logic trận hay phase 1.

## Extension trace

Biến thể kế tiếp có thật: **chiêu mới / bậc chiêu mới** (chương 2–5 đang thêm art). Hợp đồng giữ ổn định: cue `fx` mang `anchor/blend` nên chiêu mới chỉ cần khai báo thuộc tính trình bày trong `battle-cues.ts`, không sửa `playCue`. Phần phải đổi khi có chiêu mới: thêm variant trong `skill-catalog.ts` + dòng gán anchor/blend trong mapper. Không cần registry/factory — một điểm đọc thuộc tính ở scene là đủ. Chi phí: mỗi loại anchor mới (nếu phát sinh) thêm một case trong `playCue`; chấp nhận được, không dựng scaffold trước.
