# Phase 3: HUD, panel, joystick khung dọc

**Mục tiêu:** Sắp lại HUD trận, panel thành trì, joystick cho khung dọc 360×780; bỏ nhánh CSS landscape.

## Context (đã xác minh)

- `client/src/ui/battle-hud.css` — HUD tuyệt đối theo `--u` (1 px logic). `.battle-top` (dòng 42) dải trên, `.battle-dock` (dòng 257) dải dưới, grid 3 cột 16:9. **Media query `@media (orientation: portrait)`** (dòng 442-474) hiện là nhánh phụ cho dọc, tham chiếu `#rotate-hint` 44px (dòng 445) — cần thành bố cục **chính** và bỏ phần nhắc xoay.
- `client/src/ui/battle-hud.ts:216-227` — ghi `--u = canvasBox.width / LOGICAL_WIDTH`. Đổi `LOGICAL_WIDTH` (Phase 1) làm mọi `calc(var(--u)*n)` co lại → rà toàn bộ khoảng cách.
- `battle-hud.ts:202-203` — chữ nổi đặt theo `% LOGICAL_WIDTH/HEIGHT`; tự khớp resolution mới.
- Panel thành trì: `client/src/ui/panels/*.css`/`.ts` (citadel, tower, tailor, forge, library) — panel DOM phủ canvas; rà có giả định chiều ngang không.
- `client/src/input/virtual-joystick.ts:8-9` — joystick ở **nửa trái** (`ACTIVATION_AREA_RATIO=0.5`, so với `gameSize.width`). Khung dọc hẹp ngang: cân nhắc đổi sang **nửa dưới** hoặc góc dưới-trái để không chạm nhầm vòng từ.

## Requirements

1. HUD trận: dải trên (thẻ hiệp sĩ/quái + đề) và dải dưới (ô gõ/vòng từ + nút) sắp cho khung dọc hẹp; không cắt, không chồng sân trận.
2. Bỏ nhánh CSS landscape (grid 16:9 cũ) nếu không còn dùng; media query dọc thành bố cục mặc định; bỏ tham chiếu `#rotate-hint` 44px.
3. Rà `--u`: sau khi `LOGICAL_WIDTH=360`, kiểm mọi khoảng cách/kích thước HUD còn hợp lý (nút ≥ 44px chạm được, chữ ≥ 16px tránh Safari zoom).
4. Panel thành trì vừa khung dọc, cuộn được nếu dài, mọi nút chạm được.
5. Joystick không chạm nhầm vùng vòng từ/nút chiêu trong khung dọc.

## Files

| File | Thay đổi |
|---|---|
| `client/src/ui/battle-hud.css` | Bố cục dọc thành chính; bỏ grid landscape thừa + tham chiếu rotate-hint; rà `--u` |
| `client/src/ui/battle-hud.ts` | Kiểm vị trí chữ nổi/`--u` sau đổi resolution; chỉnh nếu cần |
| `client/src/ui/panels/*.css` | Rà từng panel thành trì cho khung dọc (cuộn, không cắt) |
| `client/src/input/virtual-joystick.ts` | Chỉnh vùng kích hoạt joystick cho dọc (nửa dưới / góc dưới-trái) nếu chạm nhầm |
| `client/src/ui/word-ring.ts` | Kiểm vòng từ không đè joystick/HUD ở dọc |

## Steps

1. Sau Phase 1–2, chạy dev khung dọc: chụp hiện trạng HUD trận + mỗi panel thành trì, liệt kê chỗ cắt/chồng.
2. Sửa `battle-hud.css`: đưa bố cục dọc thành mặc định, bỏ nhánh landscape + rotate-hint; test từng trạng thái (đề, combo, kết quả, chữ nổi).
3. Rà panel thành trì từng cái (citadel/tower/tailor/forge/library): vừa khung, cuộn, nút chạm.
4. Kiểm joystick + vòng từ + nút chiêu không chồng/chạm nhầm; chỉnh `ACTIVATION_AREA_RATIO`/vùng nếu cần.
5. Kiểm bàn phím ảo iOS: ô gõ không bị che (cơ chế `--keyboard-inset` giữ nguyên từ `ios-viewport.ts`).

## Validation

- [ ] `npm run typecheck` + `npm run lint` sạch
- [ ] Device mode 430×932: HUD trận đủ dải trên/dưới, không cắt/chồng sân; đề + ô gõ/vòng từ thao tác được
- [ ] Mỗi panel thành trì vừa khung dọc, cuộn được, mọi nút chạm được
- [ ] Joystick (nửa dưới-trái) di chuyển được; không chạm nhầm vòng từ/nút chiêu
- [ ] Focus ô gõ: bàn phím ảo không che ô (khung co lên trên)

## Risk & Rollback

- **Rủi ro:** `--u` nhỏ lại làm HUD dày chữ bị tràn ở khung hẹp. **Giảm:** ưu tiên `max(px, calc(--u*n))` sẵn có; tăng ngưỡng px tối thiểu nơi cần.
- **Rollback:** CSS/panel độc lập; revert theo file.

## Phụ thuộc

Sau Phase 1 (resolution) và Phase 2 (sân trận chốt chỗ chừa cho HUD).

## Kết quả thực thi (2026-11-20)
- Bỏ nhánh `@media (orientation: portrait) and (pointer: coarse)` trong `battle-hud.css` (đặt HUD fixed ngoài canvas + chừa 44px rotate-hint). Bố cục mặc định absolute trong `.battle-stage` đã responsive theo `--u`, dùng chung cho mọi thiết bị dọc.
- **Joystick KHÔNG đổi**: chỉ tạo ở `ui-scene` (overlay đi map), không có trong battle-scene → không xung đột vòng từ. Nửa trái vẫn hợp cho ngón cái khi cầm dọc.
- **Panel thành trì KHÔNG đổi**: `citadel-panel.css` dùng `width: min(640px, 100%)` + `flex-direction: column`, tự vừa khung dọc.
- Bàn phím ảo iOS: cơ chế `--keyboard-inset` ở `index.html` co `#game-root` → canvas+stage+dock co lên, ô gõ không bị che (giữ nguyên).
- E2E xác nhận HUD trận (thẻ hiệp sĩ/quái + đề + vòng từ) hiển thị đủ, bấm được ở cả 2 thiết bị.
