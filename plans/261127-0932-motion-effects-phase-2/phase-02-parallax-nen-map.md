---
title: "Phase 2: Parallax nền map"
status: done
---

# Phase 2: Parallax nền map

## Overview

Tạo chiều sâu bằng parallax: một lớp nền cuộn chậm hơn lớp chơi khi camera di chuyển. Hiện map không có layer ảnh nền riêng, chỉ `backgroundColor` + layer tile. Hai hướng; chọn hướng ít đụng asset trước.

## Context (đã xác minh)

- Không có hệ parallax chung; mẫu tự viết duy nhất: tia nắng atmosphere `shafts.tilePositionX = scrollX * SHAFT_PARALLAX` (`golden-hour-atmosphere.ts:266`, `SHAFT_PARALLAX = 0.35`).
- Nền hiện: `cameras.main.setBackgroundColor(level.backgroundColor)` (`world-scene.ts:243`), `__bgColor` từ LDtk.
- Camera: `setBounds(0,0,widthPx,heightPx).startFollow(hero)` (`world-scene.ts:255`); `scrollX/scrollY` đọc được mỗi khung.
- Hạt/bụi/tia nắng dùng `setScrollFactor(0)` để cố định màn; parallax là `scrollFactor` trong khoảng (0,1).

## Requirements

- [x] **Hướng mặc định (không cần art mới):** một `TileSprite` phủ màn, texture là hoạ tiết nền nhẹ (gradient/đốm sẵn tạo bằng graphics, như `addDust` tạo texture), `setScrollFactor(0)` và dịch `tilePosition` theo `scrollX/scrollY * PARALLAX_FACTOR` mỗi khung — cùng mẫu tia nắng. Đặt depth **dưới mọi layer tile** (< `-1000`).
- [x] Biên độ parallax nhỏ (factor ~0.2–0.4), không lộ mép khi camera tới biên level.
- [x] Guard quality: tắt khi `ambientWeatherEnabled === false`/`disable()` (chung nhóm hiệu ứng nền) để nhất quán GĐ1.
- [ ] (Tùy chọn, cần art) nếu có ảnh nền riêng theo level/chương: nạp như backdrop và parallax ảnh đó thay texture graphics.

## Implementation Steps

1. Thêm method `GoldenHourAtmosphere.addParallaxBackdrop(factor, depth)` hoặc một helper scene riêng: tạo `TileSprite` cỡ màn, scrollFactor 0, depth dưới nền; cập nhật `tilePosition` trong cùng `update` (POST_UPDATE) đã có của atmosphere.
2. Tạo texture nền nhẹ bằng graphics (tránh asset mới cho hướng mặc định); hoặc đọc ảnh nền nếu đã có.
3. Gọi từ `world-scene.ts` khi dựng level, guard `ambientWeatherEnabled`.
4. Kiểm tay: đi quanh map thấy nền trôi chậm hơn, không lộ mép ở biên; `low` thì tắt.

## Todo

- [x] Lớp parallax nền (TileSprite + cập nhật theo scroll), depth dưới nền
- [x] Texture nền nhẹ bằng graphics (hướng mặc định, không art mới)
- [x] Guard quality + dọn khi shutdown; kiểm biên level không lộ mép
- [x] Kiểm tay + typecheck/lint/test xanh

## Success Criteria

- Nền cuộn chậm hơn lớp chơi, tạo chiều sâu; không lộ mép, không rớt fps rõ.
- `low`/`disable()`: tắt parallax.
- Không bắt buộc art mới cho hướng mặc định.

## Rủi ro & Rollback

- Rủi ro: lộ mép khi camera tới biên, hoặc nền quá nổi gây rối → factor nhỏ, alpha thấp, texture dịu. Rollback: gỡ lớp parallax và lời gọi.

## Lưu ý

Nếu muốn nền ảnh thật theo chương (đẹp hơn graphics), cần art — ghi lại và hỏi; hướng mặc định không chặn bởi art.

## Kết quả thực thi (2026-11-27)

- `GoldenHourAtmosphere.addParallaxBackdrop()` / `removeParallaxBackdrop()`: `TileSprite` phủ màn, scrollFactor 0, depth -2000, alpha 0,55, `tilePosition = scroll × 0,3` trong POST_UPDATE sẵn có; đổi cỡ màn thì `setSize`; `disable()` huỷ chung.
- `createBackdropTexture` (golden-hour-textures): ô 256 lặp liền mạch, sương + đốm màu tia nắng của preset, không cần art.
- `world-scene.ts`: tạo khi `ambientWeatherEnabled`; quality đổi sang tắt `ambientWeatherEnabled` thì gỡ nền (và dựng thẳng cây).
- **Lưu ý phạm vi thấy được:** layer `Ground` phủ kín 100% mọi level, nên nền chỉ lộ ở dải trống trên/dưới khi khung nhìn cao hơn level (màn dọc 360×936+ với level chương 1, hoặc level 704 px của chương 2–5). Đã kiểm: khung 360×936 ở Lexhold lộ dải 68 px, parallax đúng tỉ lệ (scrollX 98→29,4; 398→119,4).
