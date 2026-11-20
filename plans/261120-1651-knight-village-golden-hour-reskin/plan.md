---
title: "Re-skin chapter 1: làng hiệp sĩ Kenney + ánh sáng giờ vàng"
description: "Thay tileset DCSS u tối bằng Kenney Tiny Town + Tiny Dungeon (CC0, 16px x2 = 32px), dựng lại 5 level LDtk thành làng hiệp sĩ trung cổ, thay lớp tối DarkAtmosphere bằng lớp ánh sáng giờ vàng."
status: completed
priority: P1
effort: "L (4–6 ngày)"
branch: feature/portrait-and-battle-arena
tags: [client, art, tileset, ldtk, lighting, license]
created: 2026-11-20
---

# Re-skin chapter 1: làng hiệp sĩ Kenney + ánh sáng giờ vàng

## Overview

Người dùng đã chốt phong cách qua demo `knight-town-golden-view.png` (scratchpad): làng hiệp sĩ trung cổ dựng bằng **Kenney Tiny Town + Tiny Dungeon** (CC0), ánh sáng **giờ vàng** (nền chiều tà hồng tím, nắng ấm, tia nắng chéo có bụi, cửa sổ/cửa/cổng thành phát sáng, bóng nhà đổ, vignette).

Hiện trạng (đã xác minh):
- Map chapter 1 **sinh bằng code**: `client/scripts/generate-chapter-1.mjs` (atlas `chapter-1.png` từ `assets/tiles/dcss/*.png` + `chapter-1-tiles.json` + 5 file `.ldtkl`).
- Generator lệch với `.ldtkl` đã commit: generator cao 20–24 ô (`generate-chapter-1.mjs:113,141,168,197,220`), file `.ldtkl` đều `pxHei: 800` (25 ô, commit 391a06c sửa tay). Chạy lại generator sẽ mất thay đổi này.
- Lớp tối `DarkAtmosphere` (`client/src/render/dark-atmosphere.ts`) có 3 nơi gọi: `world-scene.ts:246`, `battle-arena.ts:47`, `roaming-monsters.ts:88,108`.
- Màu nền tối rải rác: `config/display.ts:7`, `client/index.html:6,18`, `ui-scene.ts:22`, `boot-scene.ts:25`, `__bgColor` level `#0B0A10`, CSS `--ink`.
- Sân trận dùng tên tile trong `chapter-1-tiles.json` (`battle-arena-layout.ts:83-107`), test `battle-arena-layout.test.ts:7` kiểm tên tồn tại.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Asset Kenney CC0 vào repo, credit đủ, test credit xanh | P1 |
| 2 | Generator sinh atlas Kenney 32px + 5 level làng hiệp sĩ cao 25 ô (800px), giữ entity/portal/collision hợp lệ | P1 |
| 3 | Lớp ánh sáng giờ vàng thay `DarkAtmosphere`, giữ API `addLight/removeLight/disable`, tôn trọng quality setting | P1 |
| 4 | Nền, sân trận, UI chuyển sang tông ấm sáng | P2 |
| 5 | `docs/art-direction.md` viết lại theo phong cách mới | P2 |

## Phases

| # | Phase | Status | Phụ thuộc |
|---|-------|--------|-----------|
| 1 | [Asset Kenney + credit](./phase-01-kenney-assets-credits.md) | Completed | — |
| 2 | [Generator: atlas Kenney + 5 level làng](./phase-02-generator-kenney-levels.md) | Completed | 1 |
| 3 | [Lớp ánh sáng giờ vàng](./phase-03-golden-hour-atmosphere.md) | Completed | — (song song 2) |
| 4 | [Nền, sân trận, nhân vật](./phase-04-palette-arena-characters.md) | Completed | 2, 3 |
| 5 | [Docs art-direction](./phase-05-art-direction-docs.md) | Completed | 4 |
| 6 | [Kiểm chứng tổng](./phase-06-verification.md) | In progress (chờ duyệt ảnh, đo FPS) | 1–5 |

## Non-goals

- Không đổi logic trận (`shared/src/combat`), API server, story, vị trí/luồng entity ngoài mức cần cho bố cục mới.
- Không đổi map `test-room` (chỉ dùng cho test).
- Không chạy `tools/palette-harmonize.mjs` lên asset Kenney (sẽ khử bão hòa).
- Không dùng PixelLab trong plan này.

## Success Criteria

- [ ] `npm run generate:chapter-1` tái tạo đúng 5 `.ldtkl` 800px + atlas Kenney; chạy 2 lần cho kết quả giống hệt (deterministic).
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` xanh, không warning mới.
- [ ] `npm run test:e2e` xanh (đặc biệt `chapter-1`, `battle`).
- [ ] Ảnh chụp game ở viewport 360x780 (iPhone) của Lexhold, Misty_Fields, một trận đấu: nhìn khớp demo đã duyệt (tông ấm, cửa sổ sáng, tia nắng, không còn lớp tối).
- [ ] FPS không tụt so với hiện tại trên quality thấp (lớp ánh sáng tắt được qua `dynamicLightingEnabled`).
- [ ] `assets/CREDITS.md` có Kenney Tiny Town + Tiny Dungeon (CC0).

## Rủi ro chính

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Đổi tên tile trong `chapter-1-tiles.json` làm vỡ sân trận | Phase 2 giữ hợp đồng tên: sân trận chuyển sang tên mới cùng phase 4, test tên tile chạy lại |
| Bố cục mới chặn đường portal/spawn | Test reachability sẵn có trong `chapter-1-map.test.ts` |
| Lớp ánh sáng vẽ mỗi frame tốn GPU trên iPhone | Phần tĩnh (tông màu, bóng, tia nắng) bake 1 lần; chỉ đuốc nhấp nháy vẽ động |
| Nhân vật LPC/DCSS lệch phong cách Kenney | Đã chốt giữ; kiểm ảnh chụp phase 6, nếu lệch nhiều thì mở plan riêng |

## Quyết định đã chốt (validation 2026-11-20)

1. Nhân vật: **giữ LPC/DCSS** (giữ animation trận); chỉ đảm bảo không tối hơn nền mới.
2. Lexhold: **giữ 36x25 ô**; 4 level còn lại giữ chiều rộng, cao 25 ô.
3. Docs: **Kenney CC0 là nguồn asset chính**; bỏ PixelLab khỏi vai trò nguồn chính.

<!-- slug: knight-village-golden-hour-reskin -->
