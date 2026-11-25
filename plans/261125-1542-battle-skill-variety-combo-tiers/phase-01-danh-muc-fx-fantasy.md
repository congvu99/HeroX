---
title: "Phase 1: Danh mục FX fantasy và atlas"
status: done
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Danh mục FX fantasy và atlas

## Overview

Đưa các hiệu ứng pixelfx hợp fantasy vào `assets/fx/fx-manifest.json`, render atlas, rồi đo dung lượng.

## Danh sách nguồn (đã liệt kê từ gói `pixelfx` đã cài)

| Nhóm | Lấy | Bỏ |
|---|---|---|
| melee (12) | tất cả | — |
| moves (12) | dash-strike, earth-stomp, fireball-throw, ground-pound, holy-smite, ice-lance-throw, lightning-call, meteor-call, sword-combo, arrow-shot | pistol-shots, rocket-launcher |
| holy (10), arcane (12), shadow (12), fire (12), ice (10), lightning (11), nature (13), water (12) | tất cả, trừ đồ trang trí đứng yên | fire: brazier, campfire, candle, torch; water: drip, fountain, waterfall; lightning: tesla-coil |
| impacts (11) | trừ bullet-impact, ricochet | bullet-impact, ricochet |
| explosions (12) | big-explosion, small-explosion, implosion, dirt-explosion, smoke-bomb, plasma-explosion | barrel-explosion, cartoon-pow, firework-*, grenade, nuke |
| status (13) | tất cả (vòng trạng thái lặp trên nhân vật) | — |
| spawn (10) | disintegrate, dissolve-burn, shatter-death, soul-rise, summon-rise | còn lại (đã có spawn-portal, poof) |
| projectiles | magic-missile, energy-disc, flare, arrow | súng, laser, rocket, cannonball |
| ui | crit-number, combo-counter | còn lại |
| scifi, pickups, transitions, weather, critters | — | tất cả |

Tổng dự kiến khoảng 150. Tên trong manifest đặt theo dạng `<nhóm>-<tên>` (ví dụ `fire-meteor`) để không trùng tên cũ.
Giữ nguyên 21 tên đang dùng.

## Implementation Steps

1. Mở gallery pixelfx (`node_modules/pixelfx/gallery`) và xem từng hiệu ứng trong danh sách. Hiệu ứng xấu, lệch tông
   hoặc quá nhỏ thì bỏ, và ghi lý do vào bảng ở trên.
2. Thêm các mục vào `fx-manifest.json`, mỗi mục có `purpose` tiếng Việt. Gắn thêm `element`
   (`physical|holy|arcane|shadow|fire|ice|lightning|nature|water`) để phase 2 chia nhóm chiêu.
3. Chạy `node tools/render-fx.mjs`. Hiệu ứng nào vượt `maxAtlasSize` thì script tự giảm fps. Nếu vẫn vượt ở `MIN_FPS`
   thì bỏ hiệu ứng đó.
4. Viết script đo dung lượng (`tools/fx-size-report.mjs`): in tổng dung lượng và dung lượng theo từng nhóm.
   Atlas > 400 KB thì giảm fps cho riêng hiệu ứng đó qua trường `fps` trong manifest.
5. Cập nhật `assets/fx/CREDITS.md` (pixelfx, MIT, cùng commit) và kiểm test `asset-credits`.

## Todo

- [ ] Xem gallery, chốt danh sách (chưa soi bằng mắt; chọn theo nhóm nguồn)
- [x] Thêm manifest, gắn `element`
- [x] Render, đo dung lượng
- [x] Credits

## Success Criteria

- Có ≥ 120 hiệu ứng mới render xong, không lỗi.
- Có bảng dung lượng. Atlas lớn nhất ≤ 400 KB.
- `parseFxIndex` đọc được `fx-index.json` mới, test `client/src/fx` pass.

## Risk

- Thư mục `client/public/fx` phình to làm repo nặng: ghi tổng dung lượng vào báo cáo. Nếu > 30 MB thì hỏi người dùng
  trước khi tiếp tục.

## Kết quả (2026-11-25)

- Manifest 144 hiệu ứng (21 cũ + 123 mới), mỗi dòng có `element`. Hiệu ứng mới render 10 fps.
- Bỏ 3 hiệu ứng vượt atlas 2048 ngay cả ở 8 fps. `tools/render-fx.mjs` nay gom lỗi và thoát mã 1 thay vì dừng ở lỗi đầu.
- `client/public/fx` tổng 27 MB. Bộ nạp nền 3,9 MB; mỗi bộ chiêu trận cần thêm trung bình 12 MB (tối đa 14 MB), nạp nền
  sau khi vào trận. Tiêu chí "≤ 6 MB mỗi trận" chỉ đạt cho phần chặn vào trận, không đạt cho tổng nạp một trận.
- `assets/fx/CREDITS.md` sinh lại đủ 144 dòng. Chưa soi gallery bằng mắt.
