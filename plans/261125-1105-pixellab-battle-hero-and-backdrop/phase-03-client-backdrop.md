# Phase 3 — Client: vẽ nền trận chung
Trạng thái: pending

## Files
- `client/src/render/battle-arena.ts`: `queueArenaTiles` tải thêm texture nền; constructor có nền → `add.image` tại `ARENA_ORIGIN`, origin 0, scale `ARENA_TILE_SCALE`, depth `GROUND_DEPTH`, bỏ `paintTiles`; không có → `paintTiles` như cũ. Ánh sáng, tàn lửa giữ nguyên.
- Đường dẫn asset: dùng resolver có sẵn (`mapAssetUrl` hoặc `spriteAssetUrl`, chọn cái đã phục vụ `assets/`), không hardcode URL.
- Hero sheet: không sửa `hero-battle-animations.ts` nếu cột/khung giữ như cũ.

## Kiểm
- Typecheck + `npm test` client.
- Chạy app (`/run` hoặc dev server), vào 1 trận thường và 1 trận trùm, chụp màn hình: nền hiện, hero 4 động tác đúng, không lệch vị trí.
- Xoá tạm file nền → sân lùi về tile.
