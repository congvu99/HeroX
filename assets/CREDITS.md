# Nguồn hình HeroX

File này sinh tự động bằng `node tools/build-credits.mjs` từ `assets/credits.json` và `tools/pixellab/art-recipes.json`; sửa dữ liệu nguồn rồi chạy lại, không sửa tay.

- Đường dẫn tính từ thư mục `assets/`. Hiệu ứng chiêu (pixelfx, MIT) ghi riêng ở `assets/fx/CREDITS.md`.
- Hình LPC chỉ dùng layer có ít nhất một license không phải GPL; tác giả và license từng layer ở `assets/sprites/hero/lpc-credits.csv` (trích `CREDITS.csv` của LPC).
- Hình đánh dấu `palette-harmonize` đã được đưa về bảng màu chung bằng `node tools/palette-harmonize.mjs`.

## Dungeon Crawl Stone Soup tiles (crawl-tiles Oct-5-2010)

Trang nguồn: https://opengameart.org/content/dungeon-crawl-32x32-tiles

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `sprites/monsters/elite-demon.png` | Quỷ tinh anh (red devil) (dc-mon/demons/red_devil.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | cắt sát, phóng x3, đặt khung 96 chân chạm đáy; palette-harmonize |
| `sprites/monsters/ghoul.png` | Ghoul (dc-mon/undead/ghoul.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | cắt sát, phóng x2, đặt khung 64 chân chạm đáy; palette-harmonize |
| `sprites/monsters/scarecrow-demon.png` | Trùm Quỷ Bù Nhìn (balrug) (dc-mon/demons/balrug.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | cắt sát, phóng x4, đặt khung 128 chân chạm đáy; palette-harmonize |
| `sprites/npc/keeper.png` | Tu sĩ Giữ Thư (doll người + áo tu sĩ) (player/base/human_m.png + player/body/monk_black.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | ghép doll; cắt sát, phóng x2, đặt khung 64 chân chạm đáy; palette-harmonize |
| `sprites/npc/smith.png` | Thợ rèn (doll người + giáp da + búa) (player/base/human_m.png + player/legs/pants_brown.png + player/body/leather_heavy.png + player/hair/brown1.png + player/hand1/hammer.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | ghép doll; cắt sát, phóng x2, đặt khung 64 chân chạm đáy; palette-harmonize |
| `sprites/npc/villager.png` | Dân làng vỏ rỗng (doll người, nhuộm xám nhạt) (player/base/human_m.png + player/legs/pants_short_gray.png + player/body/shirt_white1.png + player/hair/brown1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | ghép doll; nhuộm xám; cắt sát, phóng x2, đặt khung 64 chân chạm đáy; palette-harmonize |
| `sprites/props/altar.png` | Bàn thờ (dc-dngn/altars/dngn_altar.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `sprites/props/chapel-door.png` | Cửa nhà nguyện (dc-dngn/dngn_closed_door.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/brick_brown0.png` | Tile brick_brown0 (dc-dngn/wall/brick_brown0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/brick_dark0.png` | Tile brick_dark0 (dc-dngn/wall/brick_dark0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/brick_dark3.png` | Tile brick_dark3 (dc-dngn/wall/brick_dark3.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/cobble_blood1.png` | Tile cobble_blood1 (dc-dngn/floor/cobble_blood1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/cobble_blood2.png` | Tile cobble_blood2 (dc-dngn/floor/cobble_blood2.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/crumbled_column.png` | Tile crumbled_column (dc-dngn/crumbled_column.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/dngn_altar.png` | Tile dngn_altar (dc-dngn/altars/dngn_altar.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/dngn_blood_fountain.png` | Tile dngn_blood_fountain (dc-dngn/dngn_blood_fountain.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/dngn_closed_door.png` | Tile dngn_closed_door (dc-dngn/dngn_closed_door.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/dngn_granite_statue.png` | Tile dngn_granite_statue (dc-dngn/dngn_granite_statue.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/gate_closed_middle.png` | Tile gate_closed_middle (dc-dngn/gate_closed_middle.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/grass0.png` | Tile grass0 (dc-dngn/floor/grass/grass0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/grass1.png` | Tile grass1 (dc-dngn/floor/grass/grass1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/grey_dirt0.png` | Tile grey_dirt0 (dc-dngn/floor/grey_dirt0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/grey_dirt3.png` | Tile grey_dirt3 (dc-dngn/floor/grey_dirt3.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/lava0.png` | Tile lava0 (dc-dngn/floor/lava0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/lava1.png` | Tile lava1 (dc-dngn/floor/lava1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/marble_floor1.png` | Tile marble_floor1 (dc-dngn/floor/marble_floor1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/marble_floor2.png` | Tile marble_floor2 (dc-dngn/floor/marble_floor2.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/rect_gray0.png` | Tile rect_gray0 (dc-dngn/floor/rect_gray0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/rect_gray1.png` | Tile rect_gray1 (dc-dngn/floor/rect_gray1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/stone2_dark0.png` | Tile stone2_dark0 (dc-dngn/wall/stone2_dark0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/tomb0.png` | Tile tomb0 (dc-dngn/floor/tomb0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/tree1_red.png` | Tile tree1_red (dc-dngn/wall/tree1_red.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/tree2_red.png` | Tile tree2_red (dc-dngn/wall/tree2_red.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/volcanic_floor0.png` | Tile volcanic_floor0 (dc-dngn/floor/volcanic_floor0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/volcanic_floor1.png` | Tile volcanic_floor1 (dc-dngn/floor/volcanic_floor1.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |
| `tiles/dcss/volcanic_wall0.png` | Tile volcanic_wall0 (dc-dngn/wall/volcanic_wall0.png) | Nhóm phát triển Dungeon Crawl Stone Soup và các tác giả RLTiles | CC0 1.0 | palette-harmonize |

## Ghép: Kenney Tiny Town + Tiny Dungeon (CC0)

Trang nguồn: https://kenney.nl/assets

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `tilesets/chapter-1.png` | Atlas tile chương 1 (ghép) | Kenney (www.kenney.nl) | CC0 1.0 | ghép bằng client/scripts/generate-chapter-1.mjs từ tiles/kenney/tiny-town.png, tiles/kenney/tiny-dungeon.png (78 tile, phóng nearest ×2 lên 32px) |
| `tilesets/chapter-2.png` | Atlas tile chương 2 (ghép) | Kenney (www.kenney.nl) | CC0 1.0 | ghép bằng client/scripts/generate-chapter-2.mjs từ tiles/kenney/tiny-town.png, tiles/kenney/tiny-dungeon.png (78 tile, phóng nearest ×2 lên 32px) |
| `tilesets/chapter-3.png` | Atlas tile chương 3 (ghép) | Kenney (www.kenney.nl) | CC0 1.0 | ghép bằng client/scripts/generate-chapter-3.mjs từ tiles/kenney/tiny-town.png, tiles/kenney/tiny-dungeon.png (78 tile, phóng nearest ×2 lên 32px) |
| `tilesets/chapter-4.png` | Atlas tile chương 4 (ghép) | Kenney (www.kenney.nl) | CC0 1.0 | ghép bằng client/scripts/generate-chapter-4.mjs từ tiles/kenney/tiny-town.png, tiles/kenney/tiny-dungeon.png (78 tile, phóng nearest ×2 lên 32px) |
| `tilesets/chapter-5.png` | Atlas tile chương 5 (ghép) | Kenney (www.kenney.nl) | CC0 1.0 | ghép bằng client/scripts/generate-chapter-5.mjs từ tiles/kenney/tiny-town.png, tiles/kenney/tiny-dungeon.png (78 tile, phóng nearest ×2 lên 32px) |

## HeroX, vẽ bằng script

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `sprites/props/chest-closed.png` | Rương đóng | HeroX | Thuộc dự án HeroX | tools/lib/prop-painters.mjs; palette-harmonize |
| `sprites/props/chest-open.png` | Rương mở | HeroX | Thuộc dự án HeroX | tools/lib/prop-painters.mjs; palette-harmonize |
| `tilesets/placeholder-dungeon.png` | Tileset placeholder của map thử test-room | HeroX | Thuộc dự án HeroX | sinh bằng client/scripts/generate-test-room.mjs; không chỉnh tông (chỉ dùng cho map thử) |

## Kenney Tiny Dungeon

Trang nguồn: https://kenney.nl/assets/tiny-dungeon

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `tiles/kenney/tiny-dungeon.png` | Tiny Dungeon 1.0 tilemap (16px) | Kenney (www.kenney.nl) | CC0 1.0 | không chỉnh (tilemap_packed.png) |

## Kenney Tiny Town

Trang nguồn: https://kenney.nl/assets/tiny-town

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `tiles/kenney/tiny-town.png` | Tiny Town 1.1 tilemap (16px) | Kenney (www.kenney.nl) | CC0 1.0 | không chỉnh (tilemap_packed.png) |

## PixelLab (AI pixel art, api.pixellab.ai)

Trang nguồn: https://www.pixellab.ai/

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `backgrounds/battle-arena.png` | Nền sân trận chung (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-ash-forest.png` | Nền sân trận rừng tro (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-broken-heaven.png` | Nền sân trận đền mặt trăng (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-catacomb.png` | Nền sân trận hầm mộ thánh (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-fields.png` | Nền sân trận đồng hoang (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-hellmaw.png` | Nền sân trận vực thẳm địa ngục (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-lair.png` | Nền sân trận hang trùm (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `backgrounds/battle-village.png` | Nền sân trận làng bỏ hoang (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô |
| `sprites/hero/hero_battle_back.png` | Hero Hiệp sĩ Thánh Ngôn - dáng lưng trong trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh hướng bắc 128, đặt khung 128 chân chạm đáy; chuyển động làm bằng tween |
| `sprites/monsters/antonym-demon.png` | Quái antonym-demon (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 128 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/ash-sprite.png` | Quái ash-sprite (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/ash-stag.png` | Quái ash-stag (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 128 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/ash-wolf.png` | Quái ash-wolf (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/antonym-demon.png` | Quái antonym-demon - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 192, đặt khung 192 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/ash-sprite.png` | Quái ash-sprite - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/ash-stag.png` | Quái ash-stag - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 192, đặt khung 192 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/ash-wolf.png` | Quái ash-wolf - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/bone-knight.png` | Quái bone-knight - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/broken-seraph.png` | Quái broken-seraph - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/fallen-angel.png` | Quái fallen-angel - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 192, đặt khung 192 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/fire-imp.png` | Quái fire-imp - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/ghoul.png` | Quái ghoul - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/imp.png` | Quái imp - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/lava-hound.png` | Quái lava-hound - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/mute-cherub.png` | Quái mute-cherub - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/nameless-bishop.png` | Quái nameless-bishop - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 192, đặt khung 192 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/red-cleric.png` | Quái red-cleric - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/scarecrow-demon.png` | Quái scarecrow-demon - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 192, đặt khung 192 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/battle/skeleton.png` | Quái skeleton - bản trận (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 128, đặt khung 128 chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY |
| `sprites/monsters/bone-knight.png` | Quái bone-knight (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/broken-seraph.png` | Quái broken-seraph (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/fallen-angel.png` | Quái fallen-angel (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 128 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/fire-imp.png` | Quái fire-imp (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/imp.png` | Quái imp (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/lava-hound.png` | Quái lava-hound (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/mute-cherub.png` | Quái mute-cherub (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/nameless-bishop.png` | Quái nameless-bishop (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 128 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/monsters/red-cleric.png` | Quái red-cleric (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |
| `sprites/npc/chained-soul.png` | Chân dung/NPC chained-soul (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 64x64 |
| `sprites/npc/crypt-warden.png` | Chân dung/NPC crypt-warden (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 64x64 |
| `sprites/npc/forest-warden.png` | Chân dung/NPC forest-warden (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 64x64 |
| `sprites/npc/gate-seraph.png` | Chân dung/NPC gate-seraph (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh 64x64 |

## Universal LPC Spritesheet Character Generator

Trang nguồn: https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/tree/04140673ec02906f8233523639733c83690df750

| File | Nội dung | Tác giả | License | Chỉnh sửa |
|---|---|---|---|---|
| `sprites/hero/hero_hurt.png` | Hero Hiệp sĩ Thánh Ngôn tạm: hurt (6x1 ô 192) | bluecarrot16, Sander Frenken (castelonia), Nila122, JaidynReiman, Johannes Sjölund (wulax), Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Stephen Challener (Redshrike), Michael Whitlock (bigbeargames), Matthew Krohn (makrohn), Napsio (Vitruvian Studio), ElizaWy | OGA-BY 3.0 / CC-BY-SA 3.0 / CC-BY-SA 4.0 | ghép layer theo tools/lpc/hero-recipes.json, nhuộm áo choàng; giữ nguyên sheet ghép từ prototype (ô 192); không chỉnh tông bảng màu vì làm bệt chi tiết giáp bạc và lệch màu áo choàng Máu thánh đã nhuộm sẵn |
| `sprites/hero/hero_idle.png` | Hero Hiệp sĩ Thánh Ngôn tạm: idle (2x4 ô 192) | Nila122, JaidynReiman, bluecarrot16, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike), Michael Whitlock (bigbeargames), Matthew Krohn (makrohn), Napsio (Vitruvian Studio), ElizaWy, Sander Frenken (castelonia) | OGA-BY 3.0 / CC-BY-SA 3.0 / CC-BY-SA 4.0 | ghép layer theo tools/lpc/hero-recipes.json, nhuộm áo choàng; giữ nguyên sheet ghép từ prototype (ô 192); không chỉnh tông bảng màu vì làm bệt chi tiết giáp bạc và lệch màu áo choàng Máu thánh đã nhuộm sẵn |
| `sprites/hero/hero_slash.png` | Hero Hiệp sĩ Thánh Ngôn tạm: slash (6x4 ô 192) | bluecarrot16, Sander Frenken (castelonia), Nila122, JaidynReiman, Johannes Sjölund (wulax), Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Stephen Challener (Redshrike), Michael Whitlock (bigbeargames), Matthew Krohn (makrohn), Napsio (Vitruvian Studio), ElizaWy | OGA-BY 3.0 / CC-BY-SA 3.0 / CC-BY-SA 4.0 | ghép layer theo tools/lpc/hero-recipes.json, nhuộm áo choàng; giữ nguyên sheet ghép từ prototype (ô 192); không chỉnh tông bảng màu vì làm bệt chi tiết giáp bạc và lệch màu áo choàng Máu thánh đã nhuộm sẵn |
| `sprites/hero/hero_spellcast.png` | Hero Hiệp sĩ Thánh Ngôn tạm: spellcast (7x4 ô 192) | bluecarrot16, Sander Frenken (castelonia), Nila122, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike), Michael Whitlock (bigbeargames), Matthew Krohn (makrohn), Napsio (Vitruvian Studio), ElizaWy | OGA-BY 3.0 / CC-BY-SA 3.0 / CC-BY-SA 4.0 | ghép layer theo tools/lpc/hero-recipes.json, nhuộm áo choàng; giữ nguyên sheet ghép từ prototype (ô 192); không chỉnh tông bảng màu vì làm bệt chi tiết giáp bạc và lệch màu áo choàng Máu thánh đã nhuộm sẵn |
| `sprites/hero/hero_walk.png` | Hero Hiệp sĩ Thánh Ngôn tạm: walk (9x4 ô 192) | bluecarrot16, Sander Frenken (castelonia), Nila122, JaidynReiman, Johannes Sjölund (wulax), Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Stephen Challener (Redshrike), Michael Whitlock (bigbeargames), Matthew Krohn (makrohn), Napsio (Vitruvian Studio), ElizaWy | OGA-BY 3.0 / CC-BY-SA 3.0 / CC-BY-SA 4.0 | ghép layer theo tools/lpc/hero-recipes.json, nhuộm áo choàng; giữ nguyên sheet ghép từ prototype (ô 192); không chỉnh tông bảng màu vì làm bệt chi tiết giáp bạc và lệch màu áo choàng Máu thánh đã nhuộm sẵn |
| `sprites/monsters/skeleton.png` | Xương khô (thân + đầu, khung đứng hướng phải của walk) | bluecarrot16, Napsio, JaidynReiman, Johannes Sjölund (wulax), Stephen Challener (Redshrike) | OGA-BY 3.0 / CC-BY-SA 3.0 | ghép thân + đầu, cắt sát, khung 64 chân chạm đáy; palette-harmonize |

## PixelLab

| File | Mã công thức | Kích thước | Hướng | Hoạt ảnh | Ngày tạo |
|---|---|---|---|---|---|
| `backgrounds/battle-arena.png` | battle-backdrop | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-ash-forest.png` | battle-backdrop-ash-forest | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-broken-heaven.png` | battle-backdrop-broken-heaven | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-catacomb.png` | battle-backdrop-catacomb | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-fields.png` | battle-backdrop-fields | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-hellmaw.png` | battle-backdrop-hellmaw | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-lair.png` | battle-backdrop-lair | 192x352 | 4 | still | 2026-11-25 |
| `backgrounds/battle-village.png` | battle-backdrop-village | 192x352 | 4 | still | 2026-11-25 |
| `sprites/hero/hero_battle_back.png` | hero-back | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/antonym-demon.png` | antonym-demon | 128x128 | 4 | still | 2026-11-23 |
| `sprites/monsters/ash-sprite.png` | ash-sprite | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/ash-stag.png` | ash-stag | 128x128 | 4 | still | 2026-11-23 |
| `sprites/monsters/ash-wolf.png` | ash-wolf | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/battle/antonym-demon.png` | antonym-demon-battle | 192x192 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/ash-sprite.png` | ash-sprite-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/ash-stag.png` | ash-stag-battle | 192x192 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/ash-wolf.png` | ash-wolf-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/bone-knight.png` | bone-knight-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/broken-seraph.png` | broken-seraph-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/fallen-angel.png` | fallen-angel-battle | 192x192 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/fire-imp.png` | fire-imp-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/ghoul.png` | ghoul-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/imp.png` | imp-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/lava-hound.png` | lava-hound-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/mute-cherub.png` | mute-cherub-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/nameless-bishop.png` | nameless-bishop-battle | 192x192 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/red-cleric.png` | red-cleric-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/scarecrow-demon.png` | scarecrow-demon-battle | 192x192 | 4 | still | 2026-11-25 |
| `sprites/monsters/battle/skeleton.png` | skeleton-battle | 128x128 | 4 | still | 2026-11-25 |
| `sprites/monsters/bone-knight.png` | bone-knight | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/broken-seraph.png` | broken-seraph | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/fallen-angel.png` | fallen-angel | 128x128 | 4 | still | 2026-11-23 |
| `sprites/monsters/fire-imp.png` | fire-imp | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/imp.png` | imp | 64x64 | 4 | still | 2026-11-20 |
| `sprites/monsters/lava-hound.png` | lava-hound | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/mute-cherub.png` | mute-cherub | 64x64 | 4 | still | 2026-11-23 |
| `sprites/monsters/nameless-bishop.png` | nameless-bishop | 128x128 | 4 | still | 2026-11-23 |
| `sprites/monsters/red-cleric.png` | red-cleric | 64x64 | 4 | still | 2026-11-23 |
| `sprites/npc/chained-soul.png` | portrait-chained-soul | 64x64 | 4 | still | 2026-11-23 |
| `sprites/npc/crypt-warden.png` | portrait-crypt-warden | 64x64 | 4 | still | 2026-11-23 |
| `sprites/npc/forest-warden.png` | portrait-forest-warden | 64x64 | 4 | still | 2026-11-23 |
| `sprites/npc/gate-seraph.png` | portrait-gate-seraph | 64x64 | 4 | still | 2026-11-23 |

Prompt, seed và ảnh tham chiếu để tạo lại: `tools/pixellab/art-recipes.json`.
