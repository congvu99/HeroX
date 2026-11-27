---
title: "Phase 2: Áp weather lên map và sân trận"
status: done
---

# Phase 2: Áp weather lên map và sân trận

## Overview

Dùng bảng `WeatherSpec` (P1) để phát hạt môi trường: trên map thế giới (ngoài bụi đã có) và trong sân trận theo từng theme. Thêm một method chung trên `GoldenHourAtmosphere` để không lặp code particle; map và trận gọi cùng method.

## Context (đã xác minh)

- `GoldenHourAtmosphere.addDust` (`golden-hour-atmosphere.ts:236`) đã dựng particle bụi phủ màn (scrollFactor 0, depth `DUST_DEPTH`). Khuôn này tái dùng được cho weather.
- Map: `world-scene.ts` tạo `atmosphere` và gọi `addWindowGlows`/`addShadows`/`addLight` khi dựng level (quanh dòng 276-314).
- Trận: `BattleArena` (`battle-arena.ts:83`) dựng `this.atmosphere` và gọi `addEmbers` khi `layout.embers && lightingEnabled` (dòng 93).
- Quality: `ambientWeatherEnabled` và `particleDensity` trong `QualityProfile`.

## Requirements

- [ ] Method mới `GoldenHourAtmosphere.addWeather(spec: WeatherSpec, zone?: Rectangle, densityScale?: number)`: dựng particle theo spec, tái dùng khuôn `addDust`. Phủ màn (scrollFactor 0) nếu không truyền `zone`; sân trận truyền zone sân. Không có spec (`null`) thì không làm gì.
- [ ] `addWeather` đọc `particleDensity` để giảm `quantity`/tăng `frequency` ở máy yếu; bị `disable()` thì dừng như các object khác (đưa vào `this.objects`).
- [ ] Map (`world-scene.ts`): sau khi dựng atmosphere, gọi `addWeather(mapWeatherFor(...))` khi `ambientWeatherEnabled`. Bụi lấp lánh cũ giữ nguyên (weather là lớp bổ sung, không thay).
- [ ] Trận (`battle-arena.ts`): thay nhánh chỉ-ember bằng: nếu `layout.embers` → `addEmbers` như cũ; đồng thời `addWeather(arenaWeatherFor(layout.theme))` cho theme không-lửa. Hai thứ không chồng (ember-theme trả `null` ở bảng P1).
- [ ] Không chèn `if (theme === …)` trong render; mọi khác biệt nằm ở bảng P1.

## Implementation Steps

1. Thêm `addWeather` vào `GoldenHourAtmosphere` (ngay sau `addDust`), tái dùng texture-gen và cấu trúc emitter của `addDust`; tham số từ `WeatherSpec`.
2. Map: trong `world-scene.ts` chỗ dựng atmosphere, gọi `addWeather` với spec của level/preset; guard bằng `ambientWeatherEnabled`.
3. Trận: trong `battle-arena.ts` constructor, sau khối ember, gọi `addWeather(arenaWeatherFor(layout.theme))` guard bằng `lightingEnabled`/quality.
4. Kiểm bằng mắt dev: `fields` thấy lá bay, `catacomb` thấy đốm sáng, `hellmaw` giữ ember không có weather trùng.

## Todo

- [ ] `addWeather` trên `GoldenHourAtmosphere` (tái dùng khuôn `addDust`, tôn trọng `particleDensity`, vào `this.objects`)
- [ ] Gọi `addWeather` cho map trong `world-scene.ts` (guard `ambientWeatherEnabled`)
- [ ] Gọi `addWeather` cho sân trận trong `battle-arena.ts` theo theme
- [ ] Kiểm tay vài theme map + trận; xác nhận ember-theme không trùng weather
- [ ] typecheck/lint/test xanh

## Success Criteria

- Map mỗi level có hạt môi trường hợp tông, cộng thêm bụi cũ.
- Mỗi theme sân có hạt riêng; `lair`/`hellmaw` giữ nguyên ember, không có hạt chồng.
- Ở `low`/`disable()`, weather tắt; không tụt fps rõ.

## Rủi ro & Rollback

- Rủi ro: quá nhiều hạt gây rối/tụt fps → giảm `frequency`/`quantity` trong bảng P1, đã có `particleDensity` chặn. Rollback: gỡ `addWeather` khỏi 2 call-site và method (map/trận trở lại như cũ).
