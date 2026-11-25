---
title: "Phase 2: Bộ chiêu 5 bậc combo và bốc ngẫu nhiên"
status: done
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Bộ chiêu 5 bậc combo và bốc ngẫu nhiên

## Overview

Thêm danh mục **chiêu** (move) trong `shared` theo loại chiêu × bậc combo. Mỗi trận dựng một **bộ chiêu của trận** từ
seed, rồi mỗi đòn đúng bốc một chiêu trong nhóm phù hợp và không lặp chiêu vừa dùng.

## Thiết kế

- `shared/src/combat/combo-tier.ts`
  - `COMBO_TIERS = [1,2,3,4,5]`, ngưỡng `[1, 2, 4, 6, 10]`.
  - `comboTierFor(count)`: 1 → 1; 2–3 → 2; 4–5 → 3; 6–9 → 4; 10+ → 5.
- `shared/src/data/skill-moves.ts` khai báo `SkillMove`:
  - Trường chính: `id`, `kind`, `comboTier`, `name`, `description` (tiếng Việt).
  - Trường hiệu ứng: `castFx`, `impactFx`, `projectile?` (tone theo hệ), `fxScale`.
  - `status?: StatusApplication`: kiểu này khai ở phase 3. Phase 2 để trống.
- Mỗi loại có ≥ 3 chiêu ở mỗi bậc, tổng ≥ 60 chiêu. Hệ (element) dùng theo loại:
  - **attack** (động từ): physical, fire, lightning, holy. Bậc 1 chém; bậc 5 có meteor-call, lightning-call, holy-pillar.
  - **guard** (danh từ): holy, ice, nature, water. Gồm divine-shield, ice-crystal, thorns, water-orb...
  - **empower** (tính từ): shadow, arcane, nature, ice. Gồm curse, hex-sigil, root-snare, freeze, black-hole ở bậc 5.
  - **evade** (trạng từ, giới từ): arcane, lightning, wind. Gồm blink, dash-strike, spark-arc, tornado.
- **Bộ chiêu của trận:**
  - `buildBattleDeck(seed)` chọn tối đa 2 chiêu cho mỗi (loại, bậc), tức tối đa 40 chiêu.
  - Danh sách tên FX của bộ chiêu được dùng để nạp atlas (phase 4).
  - Bộ chiêu là dữ liệu suy ra từ `setup`, không lưu thêm vào DB.
- **Bốc chiêu:**
  - RNG riêng `moveRngState` trong `BattleState`, khởi tạo bằng `seed ^ MOVE_STREAM_SALT`. Nhờ vậy dãy đề không đổi.
  - `pickMove(deck, kind, tier, lastMoveIdByKind, rng)` bỏ chiêu vừa dùng của loại đó. Nhóm chỉ còn 1 chiêu thì dùng
    lại chiêu đó.
  - Từ đã thuộc (`mastered`) được nâng thêm 1 bậc hình, tối đa bậc 5. Cách này giữ ý nghĩa cũ của `skillVariantFor`.
- **Sự kiện:** `cast` thêm `moveId` và `comboTier`.
  - Tên `skill` giữ nguyên để không phá client cũ hay test.
  - `cast` hiện phát **trước** `extendCombo`. Phải đổi thứ tự để tính bậc từ combo mới. Ghi test cho thứ tự sự kiện.
- Danh mục cũ `SKILL_CATALOG` vẫn giữ cho thành trì (tên bậc tháp). Không xoá.

## Files

- Mới: `shared/src/combat/combo-tier.ts`, `shared/src/data/skill-moves.ts`, `shared/src/combat/skill-move-picker.ts`
  và test đi kèm.
- Sửa: `shared/src/combat/battle-state.ts` (thêm trạng thái RNG chiêu, `lastMoveIdByKind`, sự kiện `cast`),
  `shared/src/index.ts` (export).

## Todo

- [x] `comboTierFor` và test ranh giới (1, 2, 3, 4, 5, 6, 9, 10, 25)
- [x] Danh mục ≥ 60 chiêu. Test kiểm mọi `castFx`/`impactFx` có trong `fx-manifest.json`
- [x] `buildBattleDeck` tất định theo seed, mỗi nhóm có chiêu
- [x] `pickMove`: test không lặp trong 1.000 lần bốc, test tất định
- [x] `battle-state` phát `moveId`, `comboTier`. Test replay vẫn pass, dãy `prompt` của các seed mẫu không đổi

## Success Criteria

Có test chứng minh dãy đề không đổi so với trước khi sửa (so trên 3 seed mẫu) và replay tất định.

## Kết quả (2026-11-25)

- `combo-tier.ts`, `skill-moves.ts` (attack 4/4/4/5/4, guard/empower/evade 3 mỗi bậc), `skill-move-picker.ts`.
- `buildBattleDeck`: 2 chiêu mỗi nhóm mỗi trận, tất định theo seed, để giới hạn atlas phải nạp.
- Dãy đề không đổi so với HEAD (so trên 3 seed bằng bản sao tạm của `battle-state.ts` cũ).
- Danh mục không có trường mô tả chiêu (lệch thiết kế, không cần cho màn trận).
