---
phase: 3
title: "Lõi game: scene, input, loader LDtk, di chuyển"
status: pending
priority: P1
effort: "3d"
dependencies: [1]
---

# Phase 03: Lõi game

## Goal
Nhân vật đi lại trên map LDtk có va chạm, chuyển map qua cổng, điều khiển bằng bàn phím và joystick ảo, hình pixel sắc nét trên PC và iPhone.

## Files to Create
- `client/src/config/display.ts` — độ phân giải logic 640×360 (lưới tile 32px, thấy khoảng 20×11 ô; hero LPC khung 64×64), `pixelArt: true`, `roundPixels`, scale `FIT` + zoom số nguyên khi được, xử lý `safe-area-inset`.
- `client/src/render/dark-atmosphere.ts` — không khí kiểu Diablo trên góc nhìn top-down: lớp tối + vùng sáng quanh hero/đuốc (render texture có mask), vignette, tắt bớt trên máy yếu (phase 08).
- `client/src/scenes/boot-scene.ts` — nạp asset tối thiểu, gọi `/herox/api/me`; chưa đăng nhập → màn "Đăng nhập LingoBrain" có link về `/`.
- `client/src/scenes/world-scene.ts` — dựng map, player, camera follow, chuyển map.
- `client/src/maps/ldtk-loader.ts` — đọc JSON LDtk (project JSON): tile layers / auto-layers → `Phaser.Tilemaps`, IntGrid `Collision` → thân va chạm, entities (`PlayerSpawn`, `Portal{targetLevel,targetSpawn}`, `Npc{dialogId}`, `Chest{itemId}`, `BattleTrigger{encounterId}`).
- `client/src/maps/ldtk-types.ts` — kiểu tối thiểu phần JSON dùng tới.
- `client/src/input/input-controller.ts` — gộp bàn phím (WASD, mũi tên) và joystick ảo; phát hiện thiết bị cảm ứng bằng `pointer: coarse`.
- `client/src/input/virtual-joystick.ts`.
- `assets/maps/test-room.ldtk` — map thử nhỏ.
- `client/test/ldtk-loader.test.ts` — parse map thử, đếm entity, va chạm.

## Tasks
1. Kiểm tra bản LDtk mới nhất và định dạng JSON hiện hành trước khi viết loader (`[UNVERIFIED]` phiên bản cụ thể). Ghi phiên bản vào README; loader kiểm `jsonVersion` và báo lỗi rõ khi khác major.
2. Chọn "Save levels to separate files" để client chỉ nạp level đang dùng.
3. Va chạm: Arcade Physics, hitbox ở chân nhân vật (khoảng 20×12 trong khung 64×64 của LPC); sắp lớp theo trục y để hero đi sau/trước cột, cây; di chuyển 8 hướng (LPC có 4 hướng, đi chéo dùng hướng ngang gần nhất), tốc độ chuẩn hoá theo đường chéo.
4. Camera giới hạn theo biên level; chuyển level có fade.
5. Tạm dùng sprite placeholder; asset thật ở phase 07.

## Verification
- `npm test -w client` pass.
- Dev: đi hết map thử, không xuyên tường, qua cổng sang level 2 và quay lại đúng spawn.
- Chrome DevTools giả lập iPhone 12: joystick hoạt động, hình không nhoè.
