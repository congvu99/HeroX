# Phase 2: Xoay sân trận sang dọc

**Mục tiêu:** Chuyển sân trận từ ngang (hiệp sĩ trái / quái phải) sang dọc (hiệp sĩ **dưới** nhìn lên / quái **trên**). Phần nặng nhất của kế hoạch.

## Context (đã xác minh)

- `client/src/battle/battle-arena-layout.ts:7-9` — `ARENA_COLUMNS=10`, `ARENA_ROWS=6`, scale ×2 → sân 640×360. ASCII `rows` (dòng 66,76,86) là 10 cột × 6 hàng; hàng 2–4 để trống cho nhân vật; vật thể ở mép.
- `client/src/render/battle-actors.ts:14-15` — `HERO_FEET={x:176,y:262}`, `ENEMY_FEET={x:464,y:262}` (cùng y, khác x = bố cục ngang). Mọi tween lao/giật/né dùng trục **x**: `strikeLunge`, `knockback`, `dash`, `enemyLunge` (dòng 52, 138, 180-181, 198, 204).
- `client/src/render/hero-battle-animations.ts:9-10` — hiệp sĩ chỉ dùng **1 hàng hướng** `RIGHT_ROW=3` (nhìn phải). Sheet LPC đủ 4 hàng (lên=0, trái=1, xuống=2, phải=3) → đổi sang **UP_ROW=0** (nhìn lên) không cần vẽ lại.
- `client/src/render/battle-arena.ts:82-84` — tàn lửa (embers) phát từ hàng cuối; `cellCenter` theo column×row → tự khớp khi đổi ASCII.
- `client/src/battle/battle-cues.ts:21` — cue `fx` có `mirrored` ("hiệu ứng vốn hướng phải phía quái"). `fx-player.ts:86-87` chỉ xử lý `flipX` (lật ngang). Hướng dọc cần xoay FX 90° hoặc hướng lên/xuống.
- `client/test/battle-arena-layout.test.ts:8-15` — test khẳng định 10×6 và `STAGE_ROWS=[2,3,4]`.

## Requirements

1. Đổi sân sang bố cục dọc: cột ít hơn (vừa 360px ở scale ×2 → tối đa ~5–6 cột), hàng nhiều hơn (vừa phần sân trong 780px). Đề xuất **6 cột × 10 hàng** (cần chốt khi thực thi theo chiều cao HUD chừa).
2. Hiệp sĩ ở **hàng dưới** (nhìn lên), quái ở **hàng trên**; giữa để FX bay qua theo trục dọc.
3. Animation hiệp sĩ đổi sang hàng hướng **lên** (`UP_ROW=0`).
4. Mọi tween lao/giật/né/lao-quái đổi từ trục **x** sang trục **y** (hiệp sĩ lao lên = y giảm; quái lao xuống = y tăng).
5. FX trận đi đúng trục dọc: cue hướng về quái bay lên, đòn quái về hiệp sĩ bay xuống. Thay cơ chế `flipX` bằng xoay/flip trục dọc phù hợp.
6. Embers, nguồn sáng, bóng đổ khớp bố cục mới.
7. Cập nhật `battle-arena-layout.test.ts` theo kích thước + `STAGE_ROWS` mới.

## Files

| File | Thay đổi |
|---|---|
| `client/src/battle/battle-arena-layout.ts` | `ARENA_COLUMNS`/`ARENA_ROWS` mới; viết lại `rows` ASCII 3 chủ đề theo dọc; vị trí vật thể ở mép dọc; comment |
| `client/src/render/battle-actors.ts` | `HERO_FEET`/`ENEMY_FEET` sang trên/dưới; đổi mọi tween trục x→y; kiểm `DISTANCE`/hướng dấu |
| `client/src/render/hero-battle-animations.ts` | `RIGHT_ROW=3` → `UP_ROW=0`; đổi tên hằng + comment |
| `client/src/render/battle-arena.ts` | Kiểm embers zone + `cellCenter` khớp bố cục mới (chủ yếu tự khớp) |
| `client/src/fx/fx-player.ts` | Thêm xử lý hướng dọc (xoay 90° hoặc flipY) thay/bổ sung `flipX` |
| `client/src/battle/battle-cues.ts` | Đổi ngữ nghĩa `mirrored` → hướng dọc nếu cần; cập nhật comment dòng 21 |
| `client/test/battle-arena-layout.test.ts` | Cập nhật kỳ vọng kích thước + `STAGE_ROWS` dọc |
| `client/test/battle-cues.test.ts` | Cập nhật nếu đổi cue hướng |

## Steps

1. Thiết kế bố cục dọc trên giấy: số cột/hàng vừa khung sân dọc (chừa chỗ HUD trên/dưới của Phase 3). Chốt tọa độ `HERO_FEET`/`ENEMY_FEET`.
2. Viết lại 3 ASCII `rows` (fields/village/lair) theo bố cục dọc, giữ hàng nhân vật trống + nguồn sáng + embers ở lair.
3. Cập nhật `battle-arena-layout.test.ts` trước (TDD-nhẹ): kỳ vọng kích thước mới, `STAGE_ROWS` dọc, mọi tile trong atlas.
4. Đổi `hero-battle-animations.ts` sang hàng hướng lên.
5. Đổi `battle-actors.ts`: tọa độ + toàn bộ tween x→y (chú ý dấu: lao lên y giảm, giật lùi xuống y tăng với hiệp sĩ; ngược với quái).
6. Sửa FX: cue hướng quái → bay lên; đòn quái → bay xuống. Thay `flipX` bằng cơ chế trục dọc; cập nhật `battle-cues.ts` + test.
7. Kiểm mắt thường trên dev (dev không đăng nhập mở sẵn trận thử): chém, trúng đòn, né (lướt/thuấn bộ), thua (ngã), trùm + embers.

## Validation

- [ ] `npm test` — `battle-arena-layout.test.ts` + `battle-cues.test.ts` xanh
- [ ] `npm run typecheck` + `npm run lint` sạch
- [ ] Mắt thường: hiệp sĩ dưới nhìn lên, quái trên; chém lao lên, trúng đòn giật đúng chiều; FX bay đúng trục dọc; không tràn/mất tile; embers/nguồn sáng đúng chỗ
- [ ] `npm run test:coverage` — logic trận shared vẫn ≥ 90% (phase này không đụng shared, chỉ đảm bảo không vỡ)

## Risk & Rollback

- **Rủi ro cao nhất:** dấu hướng tween sai → nhân vật lao nhầm chiều. **Giảm:** đổi từng tween + kiểm mắt ngay.
- **Rủi ro FX:** `flipX` không đủ cho dọc; có FX trông lệch. **Giảm:** task riêng bước 6; nếu phức tạp, tối thiểu xoay 90° toàn cục cho FX hướng.
- **Rollback:** phase cô lập trong render/battle; revert nhóm file trận về bản ngang.

## Phụ thuộc

Sau Phase 1 (cần resolution dọc để chốt kích thước sân). Trước/song song Phase 3 nhưng nên xong trước vì HUD chừa chỗ theo sân.

## Kết quả thực thi (2026-11-20)
- Sân dọc **6×11 ô** (384×704); ASCII 3 chủ đề viết lại, `STAGE_ROWS=[2..8]`, test layout 8/8 xanh.
- `HERO_FEET={x:192,y:552}` (dưới nhìn lên), `ENEMY_FEET={x:192,y:168}` (trên). Frame tĩnh hero đổi `'right'`→`'up'`.
- Mọi tween x→y: strike lao lên (`-strikeLunge`), dash né xuống (`+dash`), hero hurt xuống, quái hurt lên, quái lunge xuống (`+enemyLunge`); `knockback` helper chuyển trục y.
- `hero-battle-animations.ts`: `RIGHT_ROW=3`→`UP_ROW=0`.
- FX: thêm option `angle` ở `fx-player.ts`; battle-scene dùng `FX_ANGLE_UP=-90`/`FX_ANGLE_DOWN=90` thay `flipX`.
- E2E ảnh chụp xác nhận: hiệp sĩ dưới nhìn lên, quái trên, sân cánh đồng/nến/mộ đúng bố cục dọc. Xanh.
