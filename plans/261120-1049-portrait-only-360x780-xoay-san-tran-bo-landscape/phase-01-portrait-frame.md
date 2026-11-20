# Phase 1: Khung dọc & bỏ landscape

**Mục tiêu:** Đổi logic resolution sang 360×780, bỏ hẳn nhắc xoay/landscape, giữ camera world không đổi tầm nhìn ngang. Nền tảng cho các phase sau.

## Context

- `client/src/config/display.ts:2-3` — `LOGICAL_WIDTH=640`, `LOGICAL_HEIGHT=360`. Cơ chế `computeDisplayZoom` (dòng 21-31) đã co giãn theo khung + DPR, không giả định hướng → tái dùng nguyên.
- `client/src/main.ts:17-32` — Phaser `width/height` đọc từ hằng số trên; `scale.mode = NONE`, căn giữa bằng CSS.
- `client/index.html:34-53` — `#rotate-hint` + media query `(orientation: portrait)` hiện chữ nhắc xoay.
- Camera world: xem `world-scene.ts` (dùng `scale.gameSize`); cần giữ tầm nhìn ngang như cũ, dọc thấy nhiều hàng hơn.

## Requirements

1. `LOGICAL_WIDTH=360`, `LOGICAL_HEIGHT=780`.
2. Bỏ hoàn toàn `#rotate-hint` và media query landscape trong `index.html`.
3. Camera world giữ nguyên tầm nhìn ngang (không zoom cận hơn), không lộ mép map.
4. Giữ pixel-sắc: `computeDisplayZoom` vẫn ưu tiên zoom số nguyên theo DPR 3.

## Files

| File | Thay đổi |
|---|---|
| `client/src/config/display.ts` | Đổi `LOGICAL_WIDTH=360`, `LOGICAL_HEIGHT=780`; rà comment "640×360" → "360×780" |
| `client/index.html` | Xóa `#rotate-hint` (dòng 34-53, 58), xóa media query landscape; giữ safe-area + `--keyboard-inset` |
| `client/src/scenes/world-scene.ts` | Kiểm camera zoom/bounds: đảm bảo tầm nhìn ngang world giữ nguyên; chỉnh nếu lộ mép |
| `client/src/platform/ios-viewport.ts` | Rà comment "nhắc xoay ngang" (dòng 4) cho khớp |

## Steps

1. Đổi 2 hằng số ở `display.ts`; cập nhật JSDoc dòng 1 và các comment nhắc "640×360".
2. Xóa `#rotate-hint` div + style + media query ở `index.html`. Giữ nguyên `#game-root` safe-area/flex.
3. Chạy dev (`npm run dev`), mở DevTools device mode iPhone 14 Plus (430×932): kiểm canvas lấp chiều cao, world camera không lộ mép, nhân vật di chuyển mượt.
4. Kiểm thêm 1 kích thước dọc khác (vd 393×852) để chứng minh zoom co đúng (Extension trace).
5. Nếu camera lộ mép map: chỉnh `setBounds`/zoom world cho tầm ngang khớp cũ (ghi rõ công thức trong comment).

## Validation

- [ ] `npm run typecheck` sạch
- [ ] `npm run lint` sạch
- [ ] Device mode 430×932 + 393×852: canvas lấp chiều cao, không viền đen lớn, không còn chữ nhắc xoay
- [ ] Di chuyển map không lộ mép chưa vẽ ở cả map thử và chương 1
- [ ] `npm test` (phần client logic thuần) không hồi quy

## Risk & Rollback

- **Rủi ro:** đổi height làm lộ vùng map chưa vẽ ở trên/dưới. **Giảm:** kiểm từng level; chỉnh camera bounds.
- **Rollback:** revert `display.ts` + `index.html` về 640×360 (2 file độc lập, dễ hoàn).

## Phụ thuộc

Không. Là phase nền, phải xong trước Phase 2–3.

## Kết quả thực thi (2026-11-20)

**Đã xác minh:**
- `display.ts`: `LOGICAL_WIDTH=360`, `LOGICAL_HEIGHT=780`; cập nhật comment.
- `index.html`: xóa `#rotate-hint` (div + style + media query landscape); giữ safe-area + `--keyboard-inset`.
- `ios-viewport.ts`: sửa comment "nhắc xoay ngang" → "khung dọc".
- **Phát hiện thêm (thuộc "bỏ landscape"):** `public/manifest.webmanifest` ép `orientation: landscape` → đổi `portrait`; cập nhật `pwa-files.test.ts` theo.
- Viết lại `movement-and-display.test.ts` cho logic 360×780 (case desktop giới hạn theo chiều cao, iPhone 14 Plus dọc, pixel nguyên DPR 3/DPR lẻ).
- `npm run typecheck` sạch; `npm run build` thành công; lint các file đã sửa sạch (exit 0); `npm run test:client` 166/166 xanh.
- `world-scene.ts` **không cần sửa**: `cameraBoundsFor` + `startFollow` dùng `scale.gameSize` 1:1 (không zoom cận), tự khớp resolution mới — đúng "giữ số ô, thu nhỏ cho vừa dọc".

**Chưa kiểm (cần người/thiết bị):**
- Mắt thường device mode 430×932 + 393×852: canvas lấp chiều cao, không viền đen lớn.
- Di chuyển map không lộ mép chưa vẽ ở trên/dưới (chiều cao logic tăng từ 360→780 có thể lộ vùng chưa vẽ ở level nhỏ).

**Ngoài phạm vi (ghi nhận, không sửa ở phase này):**
- `battle-hud.css:445` còn comment + 44px chừa cho `#rotate-hint` đã xóa → Phase 3 xử lý khi sắp lại HUD dọc.
- Lint lỗi sẵn có ở `prototypes/gothic-ui-demo/demo.test.mjs` (không liên quan thay đổi này).
