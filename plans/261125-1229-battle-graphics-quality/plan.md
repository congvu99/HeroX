---
status: done
created: 2026-11-25
source: plans/reports/brainstorm-261125-1229-graphics-quality-improvement.md
---
# Nâng chất lượng đồ hoạ trận (map, quái, nhân vật) — ngân sách 40 lượt

## Outcome
Trận đánh trông đồng nhất và huyền ảo: quái cùng mật độ pixel với hero (vẽ 1:1), có chuyển động và hiệu ứng; mỗi theme sân có nền riêng.

## Constraints
- Chỉ ảnh tĩnh pixflux; chuyển động bằng tween (animate PixelLab giật, đã thử 2 lần).
- Key mới (40/40) chỉ có ở biến môi trường mức User; shell của phiên hiện tại còn key cũ (1 lượt). Mỗi lệnh sinh ảnh phải nạp key từ User trước (xem phase 3).
- Sprite quái 64 px dùng chung với bản đồ thế giới (`client/src/world/roaming-monsters.ts:95`, `client/src/render/prop-sprites.ts:22`). Bản trận 128/192 px để ở `assets/sprites/monsters/battle/`, KHÔNG ghi đè file cũ.
- Thiếu file nào thì lùi về asset cũ; không đổi logic trận.
- Không vượt 40 lượt: luôn chạy với `--max-generations`.

## Non-goals
Map thế giới (LDtk/tileset), HUD, hoạt ảnh nhiều khung, chân dung NPC (để dành nếu dư lượt).

## Ngân sách
| Đợt | Nội dung | Lượt | Dự phòng |
|---|---|---|---|
| Thử | 1 quái thường 128 (`ash-wolf`) + 1 trùm 192 (`scarecrow-demon`) | 2 | — |
| A | Nền 5 theme: fields, village, lair, ash-forest, catacomb | 5 | 3 |
| B | 4 trùm còn lại 192 px | 4 | 2 |
| C | 11 quái thường còn lại 128 px | 11 | 4 |
| | **Tổng** | **22** | **9** → 31 |
| Dư | Map biển / NPC / sinh lại — chờ quyết | 9 | |

## Nhật ký lượt
| Đợt | Trước | Sau | Ghi chú |
|---|---|---|---|
| Thử | 40 | 38 | ash-wolf 128, scarecrow-demon 192 đạt; mật độ pixel khớp hero, nhuộm tinh anh được |
| A | 38 | 32 | 5 nền; `ash-forest` lọt một người giữa đường, sinh lại (seed 73571) |
| B | 32 | 27 | 4 trùm; `antonym-demon` ra tượng bán thân trên bệ, sinh lại với prompt toàn thân |
| C | 27 | 12 | 10 quái; sinh lại `imp`, `broken-seraph` (bóng đen), `fire-imp` (quả trứng), `mute-cherub` (em bé cười), rồi `broken-seraph` lần 2 (hình người không áo) |
| **Tổng** | | **28 dùng, 12 còn** | 19 ảnh mới + 9 lượt sinh lại (dự phòng 9/9 đã hết) |

## Quyết định khi làm
- Không sinh bản trận cho `elite-demon`: không loại quái nào ở client dùng file này (tinh anh = quái thường nhuộm màu). Đợt C còn 10 job.
- Bản trận hỏng thì ghi đè `promptPrefix`/`seed` qua `battleMonster(job, override)` (bảng override trong `jobs.mjs`, `jobs-chapters-2-5.mjs`), không sửa prompt bản đồ.
- Sửa lỗi có sẵn ở `golden-hour-atmosphere.ts`: sân trận cùng preset với bản đồ (`fields` = `sunny`) gỡ mất texture bóng của bản đồ khi đóng trận, bản đồ văng lỗi mỗi khung. Giờ chỉ instance đã dựng bóng mới gỡ.

## Phase
| # | File | Lượt | Trạng thái |
|---|---|---|---|
| 1 | [phase-01-enemy-effects-code.md](phase-01-enemy-effects-code.md) | 0 | done |
| 2 | [phase-02-battle-sprite-loader-and-jobs.md](phase-02-battle-sprite-loader-and-jobs.md) | 0 | done |
| 3 | [phase-03-pilot-generation.md](phase-03-pilot-generation.md) | 2 | done (40 → 38) |
| 4 | [phase-04-batch-generation.md](phase-04-batch-generation.md) | 20 (+9) | done (38 → 12) |
| 5 | [phase-05-visual-verification.md](phase-05-visual-verification.md) | 0 | done |

Phụ thuộc: 1 và 2 độc lập; 3 cần 2; 4 cần 3 đạt; 5 cuối.

## Acceptance
- Ảnh chụp Playwright (script dùng `window.__HEROX_GAME__`) cho ít nhất 1 trận mỗi theme (7) và mỗi trùm (5): idle, hero cast, hero strike, quái trúng đòn, quái chết.
- Quái và trùm trong trận vẽ 1:1 (không phóng); quái lang thang trên bản đồ thế giới giữ nguyên kích thước.
- `npx tsc --noEmit`, eslint, `npx vitest run` (234+ test), `npx vite build` sạch; không lỗi console.
- Tổng lượt dùng ≤ 40; ghi số lượt trước và sau mỗi đợt vào plan.

## Rủi ro
- Phong cách lệch giữa các đợt: dùng chung `BASE_STYLE`, `STYLE_REF`, seed cố định; xem ảnh sau mỗi đợt.
- Màu quái phải trung tính (client nhuộm MULTIPLY cho tinh anh và khiên lửa): giữ cụm `color-neutral palette` của `monster()`.
- Vite không thấy file mới: khởi động lại dev server sau mỗi đợt sinh.

## Câu hỏi mở
- 9 lượt dư: map biển (gắn sân nào?), chân dung NPC, hay giữ làm dự phòng?
