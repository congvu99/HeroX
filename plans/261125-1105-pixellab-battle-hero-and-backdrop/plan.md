---
status: done
created: 2026-11-25
---

## Kết quả (2026-11-25)
- **Nền trận chung**: ĐÃ XONG. `assets/backgrounds/battle-arena.png` (đền thiêng sáng, huyền ảo, 192x352). Client `BattleArena` vẽ nền thay lưới tile; thiếu file thì lùi về tile. Dùng 2 lượt (1 bản đá tối bỏ đi + 1 bản đền sáng theo yêu cầu mới).
- **Hero trận**: BỎ. Thử sinh base + idle + slash (3 lượt) nhưng frame giật, nhân vật nhỏ lệch góc ô, kém sheet LPC — đúng cảnh báo cũ của team. Khôi phục sheet LPC, không áp dụng. `HERO_BATTLE_JOB` giữ trong tool để tham khảo, không vào danh sách chạy.
- **Lượt**: dùng 5/9, còn 4.

## Vòng 2 (2026-11-25, 4 lượt)
- **Hero dáng lưng**: XONG. 1 ảnh tĩnh pixflux hướng bắc 128 px (`sprites/hero/hero_battle_back.png`), hiệu ứng tween ở `client/src/render/hero-battle-back.ts`. Thiếu file thì lùi về LPC.
- **Nền theo theme**: XONG. `battle-broken-heaven.png` (đền mặt trăng, ánh sáng đổi sang moonlight), `battle-hellmaw.png` (vực thẳm địa ngục). Theme khác dùng nền chung.
- **Biển**: chưa làm, chưa có chương/theme biển. Còn 1 lượt.
- Kiểm bằng ảnh chụp Playwright cho `tutorial`, `ch4-field`, `ch5-field` (idle, cast, strike).
# Hero trận đánh + nền trận chung bằng PixelLab (ngân sách 9 lượt)

## Mục tiêu
Hero trong trận và sân trận trông đẹp hơn, dùng tối đa 9 generations còn lại của gói trial (đo bằng `GET /v2/balance` ngày 2026-11-25: 9/40).

## Quyết định đã chốt (user, 2026-11-25)
- Nhân vật: **hero** (Hiệp sĩ Thánh Ngôn), chỉ sheet trận: idle, slash, spellcast, hurt.
- Nền: **1 nền dùng chung mọi trận**, thay lưới tile của `BattleArena`.

## Ngân sách
| Việc | Lượt |
|---|---|
| Base hero hướng bắc (pixflux, không xoay) | 1 |
| 4 động tác animate | 4 |
| Nền trận 192x352 (vẽ x2 = 384x704 khớp sân 6x11 ô 64px) | 1 |
| Dự phòng sinh lại | 3 |

## Ngoài phạm vi
- Không sinh lại walk sheet hero ở bản đồ (tốn 8 lượt).
- Không nền riêng theo chương.

## Phase
| # | File | Trạng thái |
|---|---|---|
| 1 | [phase-01-tool-battle-jobs.md](phase-01-tool-battle-jobs.md) | pending |
| 2 | [phase-02-generate-assets.md](phase-02-generate-assets.md) | pending |
| 3 | [phase-03-client-backdrop.md](phase-03-client-backdrop.md) | pending |

## Tiêu chí xong
- `hero_idle/slash/spellcast/hurt.png` mới, ô 192, hàng 0 hướng lên, client hiện đúng.
- `assets/backgrounds/battle-arena.png` (tên chốt ở phase 1) hiện dưới nhân vật mọi trận; thiếu file thì lùi về lưới tile như cũ.
- Credits + `art-recipes.json` cập nhật; `npm test` client pass (gồm `asset-credits.test.ts`).
- Tổng lượt dùng ≤ 9; tool dừng êm khi hết quota (exit 3).

## Rủi ro
- Hero trận lệch kiểu với walk sheet cũ ở bản đồ. Giảm: dùng cùng prompt, seed 73421, `STYLE_REF`.
- Nền chung không khớp ánh sáng/tàn lửa từng theme (hellmaw có tàn lửa mà nền không có dung nham). Chấp nhận; ghi nhận để chỉnh khi có lượt.
- Ảnh xấu và hết dự phòng. Giảm: chạy từng job một, xem ảnh trước khi chạy job kế.

## Câu hỏi mở
- Gói trial có hết hạn/nạp lại lượt không (API không báo).
