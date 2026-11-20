# Phase 4: E2E & kiểm thử toàn flow dọc

**Mục tiêu:** Đổi E2E sang khung dọc, chạy xanh toàn flow; chốt mọi acceptance criteria.

## Context (đã xác minh)

- `e2e/fixtures/e2e-fixture.ts:10` — 2 project `['desktop-chrome', 'iphone-12']`. `iphone-12` (WebKit) hiện mặc định portrait rồi; `desktop-chrome` landscape.
- `playwright.config.ts` — định nghĩa viewport/device mỗi project (cần đọc khi thực thi để đổi).
- E2E specs: `e2e/specs/{auth,battle,citadel-forge,chapter-1}.spec.ts` + support `battle-flow.ts`, `citadel-flow.ts`, `story-flow.ts`, `game-driver.ts`. `game-driver.ts` + `battle-flow.ts` đã bị sửa (git status) — kiểm còn giả định tọa độ ngang.
- Selector có thể phụ thuộc layout (vị trí joystick, nút HUD) → cập nhật nếu đổi ở Phase 2–3.

## Requirements

1. Cả 2 E2E project chạy **khung dọc** (bỏ landscape hoàn toàn theo quyết định). Cân nhắc: đổi `desktop-chrome` sang viewport dọc, hoặc thay bằng device dọc thứ hai (vd Pixel) để giữ 2 engine Chromium+WebKit.
2. Mọi spec xanh: auth → đi map → vào trận → gõ từ + vòng từ → thắng → thành trì + lò rèn.
3. Không request ghi nào ra ngoài `/herox/api/` (ràng buộc sẵn có).
4. Chốt toàn bộ success criteria ở `plan.md`.

## Files

| File | Thay đổi |
|---|---|
| `playwright.config.ts` | Đổi project sang viewport/device dọc; giữ 2 engine |
| `e2e/support/game-driver.ts` | Kiểm/sửa giả định tọa độ ngang (di chuyển, chạm) |
| `e2e/support/battle-flow.ts` | Kiểm selector/tọa độ trận theo bố cục dọc mới |
| `e2e/support/citadel-flow.ts`, `story-flow.ts` | Kiểm selector panel/story nếu đổi ở Phase 3 |
| `e2e/specs/*.spec.ts` | Cập nhật kỳ vọng layout nếu có |
| `README.md` | Cập nhật mô tả E2E project + bỏ nhắc "màn ngang"; mục "Điều khiển" nếu joystick đổi vùng |

## Steps

1. Đọc `playwright.config.ts`; đổi project sang khung dọc (chốt device thứ hai cho Chromium).
2. Chạy `npm run test:e2e`; sửa support/spec theo lỗi (selector, tọa độ joystick/HUD dọc).
3. Chạy `npm run typecheck:e2e`.
4. Cập nhật README: E2E project mới, bỏ câu "Game thiết kế cho màn ngang"/"xoay ngang", cập nhật "Điều khiển" nếu joystick đổi.
5. Rà toàn plan: mọi acceptance ở `plan.md` tick được.

## Validation

- [ ] `npm run test:e2e` xanh cả 2 project (khung dọc)
- [ ] `npm run typecheck:e2e` sạch
- [ ] `npm test` + `npm run test:coverage` xanh; logic trận shared ≥ 90%
- [ ] `npm run build` thành công (shared → server → client)
- [ ] Mọi spec không có request ghi ngoài `/herox/api/`
- [ ] README không còn nhắc landscape/xoay ngang

## Risk & Rollback

- **Rủi ro:** đổi `desktop-chrome` làm mất phủ engine Chromium. **Giảm:** thay bằng device dọc Chromium (Pixel), không bỏ engine.
- **Rollback:** E2E config/support độc lập mã sản phẩm; revert không ảnh hưởng game.

## Phụ thuộc

Sau Phase 1–3 (E2E kiểm layout cuối cùng).

## Kết quả thực thi (2026-11-20)
- `playwright.config.ts`: `desktop-chrome` → `pixel-5` (Pixel 5, Chromium dọc); `iphone-12` giữ (WebKit dọc). Giữ 2 engine.
- `e2e/fixtures/e2e-fixture.ts`: `E2E_PROJECT_NAMES` đổi `desktop-chrome`→`pixel-5` (key seed user per project).
- `game-driver.ts`/`battle-flow.ts` **không cần sửa toạ độ**: battle dùng nút DOM (`data-word-id`), di chuyển dùng driver theo level — độc lập hướng.
- README cập nhật: 2 project khung dọc, bỏ nhắc màn ngang.
- `npm run typecheck:e2e` sạch. **E2E 14/14 xanh** cả 2 project, full flow (auth, trận gõ+vòng từ, thành trì/lò rèn, chương 1).
- Lưu ý: lần chạy full đầu có 2 test pixel-5 fail do **flaky filesystem** (ENOENT ghi trace.zip/screencast dưới tải 2 worker + trace:on + screenshot:on), chạy lại đều pass — không phải lỗi app.

## Câu hỏi còn mở
- (Đã giải quyết) Chọn Pixel 5 dọc cho project Chromium để giữ cả 2 engine.
