---
title: "Phase 1: Nền tảng weather theo theme"
status: done
---

> **Quyết định (đã chốt):** Map lấy weather theo **lighting preset** (5 preset), DRY với trục màu ánh sáng đã có, thay vì theo 13 level. Sân trận lấy theo `ArenaThemeId`. Hàm: `mapWeatherForPreset(preset)` và `arenaWeatherFor(theme)` trong `client/src/render/ambient-weather.ts`.

# Phase 1: Nền tảng weather theo theme

## Overview

Tạo một bảng cấu hình thuần (tách khỏi Phaser, test được) mô tả "thời tiết môi trường" cho từng theme/level: loại hạt, màu, mật độ, hướng trôi. Cả map và sân trận dùng chung bảng này ở các phase sau. Đây là seam chia sẻ duy nhất của GĐ1.

Không render gì trong phase này; chỉ dữ liệu + hàm tra cứu + unit test, để phần render ở P2/P3 chỉ việc đọc.

## Context (đã xác minh)

- Hạt bụi hiện cấu hình bằng hằng trong `golden-hour-atmosphere.ts:29-37` (màu, size, tần số, tốc độ, alpha) và tint theo `preset.dustTint`.
- Sân trận phân biệt lửa bằng `layout.embers: boolean` (`battle-arena-layout.ts:69`), 7 theme ở `ArenaThemeId` (dòng 47).
- `QualityProfile.particleDensity` (`quality-settings.ts:22`) đã là hệ số nhân mật độ; `ambientWeatherEnabled` (dòng 24) bật/tắt thời tiết nền.

## Requirements

- [ ] Kiểu `WeatherSpec` mô tả một loại hạt môi trường: `kind` ('leaves' | 'ash' | 'motes' | 'none'), `tint`, `frequencyMs`, `lifespanMs`, `speedX/Y` (min/max), `alpha` (start/end), `size`. Dùng lại khuôn tham số particle của `addDust` để render tái dùng được.
- [ ] Hàm thuần `arenaWeatherFor(theme: ArenaThemeId): WeatherSpec | null` — bảng tra cho 7 theme (fields/ash-forest → lá; catacomb/broken-heaven → đốm sáng; lair/hellmaw → `null` vì đã có ember riêng; village → bụi nhẹ hoặc `null`).
- [ ] Hàm thuần cho map: `mapWeatherFor(levelId: string): WeatherSpec | null` **hoặc** suy từ lighting preset của level (chọn cách ít trùng lặp hơn sau khi đọc `lightingForLevel`). Quyết định ghi vào phase này trước khi code.
- [ ] Không chèn literal lặp; màu/tông lấy từ bảng, không rải magic number trong render.

## Implementation Steps

1. Đọc `client/src/render/lighting-presets.ts` (`lightingForLevel`, `lightingForArena`) để quyết định map lấy weather theo **level** hay theo **preset** — ưu tiên theo preset nếu đã đủ phân biệt, để DRY với màu ánh sáng.
2. Tạo file mới `client/src/render/ambient-weather.ts`: khai báo `WeatherSpec`, bảng theo theme, hàm `arenaWeatherFor` và `mapWeatherFor`/`weatherForPreset`.
3. Dùng constant cho các ngưỡng; comment tiếng Việt cho lựa chọn tông theo chủ đề (vd "rừng tro → lá/tro bay").
4. Viết `client/src/render/ambient-weather.test.ts` (Vitest): mỗi theme trả spec mong đợi; lair/hellmaw trả `null`; không throw với theme/level lạ (trả `null`).

## Todo

- [ ] Quyết định map-weather theo level hay preset (ghi kết luận vào Overview trước khi code)
- [ ] Tạo `ambient-weather.ts` với `WeatherSpec` + bảng + hàm tra
- [ ] Tạo `ambient-weather.test.ts` phủ 7 theme + nhánh null + input lạ
- [ ] `npm test -w @herox/client` phần test mới xanh

## Success Criteria

- Có module thuần `ambient-weather.ts` không import Phaser, test xanh, phủ mọi theme và nhánh null.
- Thêm theme/chương mới sau này chỉ cần thêm một dòng bảng (không sửa render) — được test chứng minh.

## Rủi ro & Rollback

- Rủi ro thấp: thuần dữ liệu, chưa gắn render. Rollback = xoá 2 file mới.
