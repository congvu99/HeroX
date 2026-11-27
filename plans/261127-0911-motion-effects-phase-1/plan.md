---
title: "GĐ1 — Hiệu ứng chuyển động map và map trận"
description: "Thêm hạt môi trường theo theme, hạt lửa ở đuốc, và camera động, dùng hạ tầng SceneAtmosphere/particle/quality sẵn có; không sửa LDtk/tileset."
status: done
priority: P1
effort: "S-M"
tags: [herox, client, phaser, vfx, atmosphere]
created: 2026-11-27
---

# GĐ1 — Hiệu ứng chuyển động map và map trận

## Overview

Thêm chuyển động "sống" cho bản đồ thế giới và sân trận mà không đụng tới LDtk hay tileset (để dành cho GĐ2). Toàn bộ dựa trên hạ tầng đã có: `GoldenHourAtmosphere` (hạt bụi, quầng sáng flicker), hệ hạt `addEmbers` của `BattleArena`, cue `shake`/`hitstop` của màn trận, và các cờ `QualityProfile` (`particleDensity`, `ambientWeatherEnabled`, `dynamicLightingEnabled`, `screenShakeEnabled`).

Phần lớn khung đã tồn tại; GĐ1 lấp các khoảng trống cụ thể:
- Map đã có bụi lấp lánh nhưng **chưa có hạt môi trường theo theme** (lá bay ở đồng/rừng, tàn ở hầm).
- Sân trận chỉ có ember ở hầm trùm (`layout.embers`); **chưa có hạt theo từng theme**.
- Đuốc `Torch` đã có **quầng sáng flicker** nhưng **chưa có hạt lửa** bốc lên.
- Map **chưa lắc camera** khi hero đi (chỉ có shake lúc vào trận).
- Trận đã có `shake` theo đòn; **chưa có zoom-punch** nhấn nhá đòn mạnh/combo.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Map và sân trận có hạt môi trường hợp tông theo theme/level, bật/tắt theo quality | P1 |
| 2 | Đuốc trên map có hạt lửa bốc lên, đồng bộ với quầng sáng đã có | P1 |
| 3 | Camera map lắc nhẹ khi hero di chuyển; trận có zoom-punch theo đòn mạnh/combo | P2 |

## Phases

| # | Phase | Status | Phụ thuộc |
|---|-------|--------|-----------|
| 1 | [Phase 1: Nền tảng weather theo theme](./phase-01-start.md) | Done | — |
| 2 | [Phase 2: Áp weather lên map và sân trận](./phase-02-dust-theme-tint-cho-map-va-embers-theme-cho-map-tran.md) | Done | P1 |
| 3 | [Phase 3: Hạt lửa ở đuốc Torch](./phase-03-hat-lua-o-duoc-torch-tren-map.md) | Done | P1 |
| 4 | [Phase 4: Camera lắc nhẹ khi hero đi](./phase-04-camera-lac-nhe-khi-hero-di-tren-map.md) | Done | — |
| 5 | [Phase 5: Zoom-punch theo đòn mạnh/combo](./phase-05-zoom-punch-theo-don-manh-combo-trong-tran.md) | Done | — |

P1→P2 và P1→P3 phụ thuộc tuần tự (chung helper mới). P4, P5 độc lập, chạy song song được.

## Kiến trúc (đã xác minh)

- `client/src/render/golden-hour-atmosphere.ts` — `GoldenHourAtmosphere implements SceneAtmosphere`: hạt bụi (`addDust`), quầng sáng + flicker (`addLight(source, radius, flicker)`), `disable()` khi tụt fps. Dùng chung cho map và sân trận.
- `client/src/render/scene-atmosphere.ts` — interface `SceneAtmosphere`.
- `client/src/render/battle-arena.ts` — `BattleArena` dựng nền + `addEmbers` (hạt lửa, chỉ khi `layout.embers`).
- `client/src/battle/battle-arena-layout.ts` — 7 theme (`ArenaThemeId`), mỗi theme có `embers: boolean`.
- `client/src/scenes/world-scene.ts` — dựng map, `addLight` cho hero/đuốc/portal (đuốc dòng ~287), `startFollow(hero)` (dòng ~255), `moveHero` đọc input (dòng ~545), `enterBattle` (shake/flash/zoom lúc vào trận).
- `client/src/scenes/battle-scene.ts` — cue `shake`/`hitstop` (dòng ~483-490), tôn trọng `screenShakeEnabled`.
- `client/src/platform/quality-settings.ts` — `QualityProfile`: `particleDensity`, `ambientWeatherEnabled`, `dynamicLightingEnabled`, `screenShakeEnabled`; tự hạ `high→low` khi fps thấp.

## Nguyên tắc ràng buộc

- **Không sửa** LDtk, tileset, contract server, logic trận. Chỉ thêm render phía client.
- **Không phá base**: mở rộng `GoldenHourAtmosphere`/`BattleArena` bằng method mới hoặc tham số tùy chọn có mặc định; không chèn `if (theme === X)` rải rác — gom cấu hình theo theme vào một bảng.
- **Tôn trọng quality**: hiệu ứng mới đọc `particleDensity`/`ambientWeatherEnabled`/`screenShakeEnabled`, và tắt khi `disable()`/profile `low` như hạt sẵn có.
- **Tinh tế**: biên độ nhẹ, không che nhân vật, không gây phân tâm khi gõ từ.

## Success Criteria

- [ ] Trên map mỗi level/theme thấy hạt môi trường hợp tông (lá/tàn/đốm sáng) ngoài bụi đã có.
- [ ] Trong trận mỗi theme có hạt môi trường riêng; hầm lửa giữ ember như cũ.
- [ ] Đuốc trên map có hạt lửa bốc lên trùng vị trí quầng sáng.
- [ ] Camera map lắc rất nhẹ khi hero đi, đứng yên thì tĩnh; không say xe.
- [ ] Đòn mạnh/combo trong trận có nhấn zoom ngắn rồi trả về; tắt được theo quality.
- [ ] Ở profile `low`/khi `disable()`, mọi hiệu ứng mới tắt, game vẫn đọc rõ.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` xanh; test hiện có không hỏng.

## Mở rộng (Extension trace)

Bảng weather theo theme (P1) là seam chia sẻ giữa map và sân trận. Biến thể kế tiếp đã có thật: 7 theme sân (`ArenaThemeId`) + các level map theo chương. Hợp đồng giữ ổn định: một hàm `ambientWeatherFor(themeOrLevel) -> WeatherSpec | null` thuần, test được tách khỏi Phaser. Thêm chương/theme mới chỉ cần thêm một dòng vào bảng, không sửa code render — chứng minh bằng unit test bảng (P1). Không dựng registry/plugin, chỉ một bảng tra cứu.

<!-- slug: motion-effects-phase-1 -->
