# Brainstorm: nâng chất lượng đồ hoạ trận (map, quái, nhân vật)

Ngày 2026-11-25. Quota PixelLab: **1/40 lượt** (gói trial, $0), đo qua `/v2/balance`.

## Hiện trạng (đã xem tận mắt)
- Hero trận: ảnh dáng lưng 128 px vẽ 1:1, có tween + hào quang (`client/src/render/hero-battle-back.ts`). Đẹp.
- Nền trận: 3/7 theme có nền PixelLab (chung, hellmaw, broken-heaven). `fields` (4 trận), `ash-forest`, `catacomb`, `lair`, `village` dùng nền chung đền thiêng sáng.
- Quái: 17 sprite, phần lớn 64 px phóng x2 (`ACTOR_SCALE`, `battle-actors.ts:23`) nên hạt to, đứng cạnh hero 128 px 1:1 thì lệch mật độ pixel. Trùm 128 px phóng x1.5 (`BOSS_SCALE`) là tỉ lệ lẻ, pixel méo. Quái chỉ nhún 3 px, không có hào quang/bóng theo cấp.
- Đã có sẵn: hiệu ứng pixelfx (`client/public/fx/`), texture quầng sáng `TEXTURE_KEYS.light`, preset ánh sáng theo theme.

## Hợp đồng
- **Outcome:** trận đánh trông đồng nhất và "huyền ảo" hơn: quái cùng mật độ pixel với hero, có sức sống; mỗi chương có sân riêng.
- **Constraints:** chỉ ảnh tĩnh pixflux (animate PixelLab giật, đã thử 2 lần); 1 lượt còn lại; giữ fallback khi thiếu file; không đổi logic trận.
- **Non-goals:** map thế giới (LDtk/tileset), UI HUD, hoạt ảnh nhiều khung cho quái.
- **Acceptance:** ảnh chụp Playwright cho ít nhất 1 trận mỗi theme (script dùng `window.__HEROX_GAME__`); 234 test pass; build sạch; không lỗi console.

## Phương án
| | Cách | Lượt | Dựa vào | Hỏng khi |
|---|---|---|---|---|
| A | Chỉ code: hiệu ứng quái (thở, hào quang theo cấp, loé trúng đòn, tan biến khi chết), sửa tỉ lệ trùm về số nguyên, sương/hạt bụi theo theme, rung màn + vignette khi chí mạng | 0 | Asset 64 px vẫn đủ xem | Người chơi vẫn thấy quái "hạt to" cạnh hero |
| B | Sinh lại toàn bộ ở 128 px + nền cho 5 theme còn thiếu | ~35–45 (có dự phòng) | Mua gói PixelLab | Không mua gói; prompt lệch phong cách giữa các đợt |
| C | **A ngay bây giờ + B theo thứ tự ưu tiên khi có gói** | 0 ngay, rồi theo gói | A tự đứng được | — |

**Đề xuất: C.** A miễn phí, làm được ngay và cũng cần cho asset mới. Dùng lượt cuối để **thử 1 quái 128 px** (vd `ash-wolf` hay trùm `scarecrow-demon`) đặt cạnh hero, xác nhận mật độ pixel khớp trước khi bỏ tiền mua gói.

Thứ tự ưu tiên khi có lượt (B):
1. Nền `fields` (4 trận, gồm tutorial – ấn tượng đầu), rồi `ash-forest`, `catacomb`, `lair`, `village`: 5 lượt (+3 dự phòng).
2. 5 trùm 128 px (scarecrow-demon, ash-stag, nameless-bishop, antonym-demon, fallen-angel): 5 (+2).
3. 12 quái thường lên 128 px: 12 (+4).
4. Chân dung NPC (7): tuỳ chọn.

**Better approaches:** none – hướng đề xuất là hướng anh/chị yêu cầu, chỉ đổi thứ tự (code trước, asset sau) vì quota còn 1 (`/v2/balance`).

## Câu hỏi mở
1. Có mua gói PixelLab không? Không mua thì chỉ làm A + 1 quái thử.
2. Lượt cuối: thử quái 128 hay làm nền `fields`?
3. Map biển: có định thêm chương/theme biển không (hiện không có).
