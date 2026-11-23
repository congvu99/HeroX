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
| `sprites/monsters/imp.png` | Quái imp (PixelLab) | HeroX qua PixelLab | Thuộc dự án HeroX (sinh bằng PixelLab, tài khoản HeroX) | sinh tĩnh, đặt khung 64 chân chạm đáy; màu trung tính cho MULTIPLY |

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
| `sprites/monsters/imp.png` | imp | 64x64 | 4 | still | 2026-11-20 |

Prompt, seed và ảnh tham chiếu để tạo lại: `tools/pixellab/art-recipes.json`.
