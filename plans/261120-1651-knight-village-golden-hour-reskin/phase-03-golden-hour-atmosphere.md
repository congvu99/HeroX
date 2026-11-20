---
phase: 3
title: "Lớp ánh sáng giờ vàng"
status: completed
effort: "M (1–1.5 ngày)"
---

# Phase 3: Lớp ánh sáng giờ vàng

## Context

- `client/src/render/dark-atmosphere.ts`: RenderTexture phủ màu `0x05040a` alpha 0.72, tẩy vùng sáng quanh hero/đuốc, vignette camera (WebGL), vẽ lại mỗi `POST_UPDATE`, độ sâu 9000. API: `addLight(source, radius, flicker)`, `removeLight(source)`, `disable()`.
- Nơi gọi: `world-scene.ts:246,253-266`, `battle-arena.ts:47-51`, `roaming-monsters.ts:88,108`.
- Bật/tắt theo `platform/quality-settings.ts` (`dynamicLightingEnabled`).
- Thuật toán demo đã duyệt: `light()` trong scratchpad `urban-golden-hour.py`.

## Requirements

- Lớp mới `GoldenHourAtmosphere` (file mới `client/src/render/golden-hour-atmosphere.ts`), cùng API `addLight/removeLight/disable` để 3 nơi gọi chỉ đổi tên lớp. Interface chung `SceneAtmosphere` để `roaming-monsters.ts` phụ thuộc interface, không phụ thuộc lớp cụ thể.
- Thành phần, chuyển từ demo sang Phaser:
  1. **Tông chiều tà**: phủ màu hồng tím blend MULTIPLY + dải nắng ấm ADD theo gradient (trên-phải sáng hơn) — cố định màn hình, `setScrollFactor(0)`.
  2. **Tia nắng chéo 20°**: texture sinh 1 lần (canvas), blend ADD, cuộn nhẹ theo camera (parallax) + trôi chậm; bụi lấp lánh bằng particle ít hạt.
  3. **Cửa sổ/cửa/cổng phát sáng**: glow ADD tại ô có tên trong danh sách `glow` từ `chapter-1-tiles.json` (phase 2), gắn theo world (scroll 1).
  4. **Bóng nhà**: bake 1 lần lúc tạo map từ mặt nạ Collision/building, lệch (+28px y, −18px x), làm mờ, MULTIPLY.
  5. **Đuốc/hero/quái**: `addLight` vẽ quầng ấm ADD (thay vì khoét tối); đuốc giữ nhấp nháy.
  6. **Vignette** giữ cách hiện tại (camera filter WebGL), cường độ nhẹ hơn.
- Phần tĩnh (1, 2, 4) không vẽ lại mỗi frame. Chỉ quầng sáng động cập nhật.
- `disable()` tắt mọi lớp phụ, game vẫn đọc rõ (art Kenney tự sáng).
- Mọi hệ số (màu, cường độ, góc, độ lệch bóng) là hằng có tên, comment ngắn lý do.
- Xóa `dark-atmosphere.ts` khi không còn nơi dùng (không để code chết). Đổi comment `battle-arena.ts:14` cho đúng.

## Files

- Tạo: `client/src/render/golden-hour-atmosphere.ts`, (nếu cần) `client/src/render/golden-hour-textures.ts`
- Sửa: `client/src/scenes/world-scene.ts`, `client/src/render/battle-arena.ts`, `client/src/world/roaming-monsters.ts`
- Xóa: `client/src/render/dark-atmosphere.ts`
- Test: `client/test/golden-hour-atmosphere.test.ts` (logic thuần: danh sách glow từ tiles JSON → vị trí; quản lý add/remove light; disable)

## Steps

1. Định nghĩa interface `SceneAtmosphere`, chuyển `roaming-monsters.ts` sang interface.
2. Viết lớp mới, từng thành phần một, chụp màn hình sau mỗi thành phần ở 360x780.
3. Đổi 3 nơi gọi; xóa lớp cũ.
4. Đo FPS (Phaser `game.loop.actualFps`) trên Lexhold trước/sau ở quality cao và thấp.

## Validation

- Unit test mới xanh; typecheck/lint sạch.
- Ảnh chụp game khớp demo đã duyệt; quality thấp không có overlay.

## Risk

- Phaser 4 blend mode MULTIPLY/ADD trên RenderTexture khác Phaser 3 → thử sớm ở bước 2.1, nếu không được dùng Filters (Phaser 4) hoặc tô màu bằng `setTint` trên layer tile.

## Rollback

- Revert 3 nơi gọi về `DarkAtmosphere` (lấy lại file từ git).
