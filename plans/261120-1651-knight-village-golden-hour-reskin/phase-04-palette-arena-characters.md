---
phase: 4
title: "Nền, sân trận, nhân vật"
status: completed
effort: "M (1 ngày)"
---

# Phase 4: Nền, sân trận, nhân vật

## Context

- Màu nền tối: `client/src/config/display.ts:7` `BACKGROUND_COLOR = '#0b0b12'` (dùng ở `main.ts:22`, `battle-scene.ts:127`), `client/index.html:6,18` (theme-color, body), `ui-scene.ts:22`, `boot-scene.ts:25`, CSS `--ink: #0b0a10` (`story/story.css`, `ui/battle-hud.css`, `ui/panels/citadel-panel.css`).
- Sân trận: `client/src/battle/battle-arena-layout.ts:83-107` 3 theme (fields, village, lair) dùng tên tile DCSS; `ARENA_TILE_SCALE = 2` (dòng 9). Test `battle-arena-layout.test.ts:7`.
- Nhân vật: hero LPC (ô 192), quái DCSS đã harmonize, NPC 64px (`render/prop-sprites.ts`, `render/battle-actors.ts:81`).

## Requirements

- Màu nền: đổi sang tông chiều tà ấm (một hằng palette dùng chung; CSS lấy từ biến, không lặp hex). `--ink` chỉ đổi nếu là nền màn hình; nếu là màu chữ/viền HUD thì giữ (kiểm từng chỗ).
- Sân trận: 3 theme dùng tên tile Kenney mới (fields: cỏ + rào + cây; village: đường đất + nhà + giếng; lair: sàn/tường Tiny Dungeon + xương). Lưu ý `ARENA_TILE_SCALE = 2` trên tile đã 32px → kiểm lại khung sân trận ở 360x780, chỉnh nếu thô quá.
- Nhân vật (đã chốt): giữ LPC/DCSS; kiểm sprite không bị harmonize tối hơn nền mới, không đổi `hero-sprite.ts`.

## Files

- Sửa: `client/src/config/display.ts`, `client/index.html`, `client/src/scenes/ui-scene.ts`, `client/src/scenes/boot-scene.ts`, CSS liên quan, `client/src/battle/battle-arena-layout.ts`
- Test: `client/test/battle-arena-layout.test.ts` (chạy lại, không nới)

## Steps

1. Grep toàn bộ hex tối (`0b0b12`, `0b0a10`, `05040a`) → bảng chỗ dùng, phân loại nền/chữ.
2. Đổi nền + theme-color.
3. Đổi 3 theme sân trận; chụp 3 trận ở 360x780.
4. Kiểm nhân vật trên nền mới (ảnh chụp).

## Validation

- `npx vitest run client/test/battle-arena-layout.test.ts` xanh; ảnh chụp 3 sân trận được duyệt.

## Rollback

- Revert file đã sửa.
