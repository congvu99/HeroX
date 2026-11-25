# Định hướng hình ảnh HeroX

Nguồn chuẩn cho mọi asset nhân vật, quái, map, UI. Chốt lần đầu 2026-11-12; phong cách map đổi sang làng hiệp sĩ giờ
vàng ngày 2026-11-20; sprite nhân vật (quái, trùm, NPC thoại) chuyển sang PixelLab làm nguồn chính ngày 2026-11-23
(hero giữ ngoại lệ LPC).

## Đích hình ảnh

- **Map:** làng hiệp sĩ trung cổ, pixel art 16 px phóng ×2, top-down 3/4, ánh sáng theo level: **nắng giờ vàng**,
  **hoàng hôn đỏ bóng sâu**, **ánh trăng**; tia sáng chéo, cửa sổ/cửa/cổng phát sáng, bóng nhà đổ, vignette.
- Mỗi level một chất riêng nhưng cùng tông: Lexhold (tường thành, tháp, cổng), cánh đồng (cây, rào, nghĩa trang),
  làng (nhà mái cam/xám, nhà nguyện đá), nhà nguyện (sàn đá, ghế, bàn thờ), hầm trùm (đất đỏ, đá vụn, bia mộ).
- Hero giữ như cũ: thập tự quân áo trắng thập tự đỏ, khiên lớn (sheet LPC, xem mục Hero). Quái, trùm, NPC thoại:
  sprite PixelLab màu trung tính (runtime tint MULTIPLY theo chủ đề level).
- Hiệu ứng: vệt chém vàng, vòng thánh vàng, vòng huyết đỏ; bộ pixelfx hợp tông fantasy khai ở `assets/fx/fx-manifest.json`, mỗi hiệu ứng gắn một hệ (`element`).

## Thông số kỹ thuật

| Mục | Giá trị |
|---|---|
| Góc nhìn | top-down 3/4 (không isometric, LDtk không hỗ trợ) |
| Độ phân giải logic | 360x780 khung dọc (portrait-only), `pixelArt: true` (`client/src/config/display.ts`) |
| Lưới tile | 32px (tile Kenney 16px phóng nearest ×2) |
| Chiều cao level | 25 ô (800 px) |
| Nhân vật, quái thường | khung 64x64, thân cao khoảng 48–56px, 4 hướng |
| Quái tinh anh | khung 64–96px |
| Trùm | khung 128x128 |
| Chân dung hội thoại | 64x64 hoặc 96x96 |
| Atlas | mỗi tấm ≤ 2048x2048 (WebGL iPhone) |

## Bảng màu

### Ánh sáng: 3 preset (map và sân trận)

Màu, độ đậm, góc tia, bóng đổ nằm trong `client/src/render/lighting-presets.ts` (preset và bảng gán level/sân);
`golden-hour-atmosphere.ts` chỉ dựng lớp phủ. Level chưa khai báo dùng `sunny`.

| Preset | Dùng cho | Dải màu (MULTIPLY) | Tia sáng | Bóng đổ | Vignette |
|---|---|---|---|---|---|
| `sunny` – ánh nắng giờ vàng | Lexhold, Misty_Fields, sân `fields` | `#f7c6a6` → `#a37c92` | cam vàng, 20° | 0.4, lệch (−18, +28) | 0.18 |
| `sunset` – hoàng hôn đỏ, bóng sâu | Misty_Village, sân `village` | `#f29a7a` → `#6e4a78` | đỏ cam, 38° (nắng thấp) | 0.55, dài (−34, +40) | 0.26 |
| `moonlight` – ánh trăng | Misty_Chapel, Scarecrow_Lair, sân `lair` | `#8fa6d6` → `#3c4470` | trắng xanh nhạt, 15° | xanh tím 0.5, lệch (+14, +24) | 0.34 |

Lớp chung mọi preset: quầng sáng góc trên phải (ADD), cửa sổ/cửa/cổng phát sáng theo
`assets/tilesets/chapter-1-glow.json`, quầng ấm quanh hero/quái/đuốc (đuốc chập chờn), bụi lơ lửng màu theo preset.
Ở `moonlight`, cửa sổ và đuốc đậm hơn để nổi trên nền lạnh. Nền ngoài canvas `#2e2233` (`BACKGROUND_COLOR`, khớp
`index.html`, manifest); nền level LDtk `#5DA84B` (màu cỏ).

### UI (HUD, hội thoại, panel)

| Tên | Hex | Dùng cho |
|---|---|---|
| Mực đêm | `#0b0a10` | nền hộp thoại/panel, chữ trên nút sáng |
| Tro | `#1b1720` | panel UI |
| Xương | `#d9d2c0` | chữ thường |
| Máu thánh | `#7a141c` | áo choàng, thập tự, viền nguy hiểm |
| Than hồng | `#e0602a` | lửa, động từ |
| Vàng nến | `#e8c66a` | tiêu đề, viền chọn, tính từ |
| Thánh quang | `#fff1c2` | phép thánh |
| Vực câm | `#5a2a6a` | quỷ, phép tối, trạng từ |

Danh từ dùng `#6aa8e8`. Màu từ loại phải giống nhau ở mọi màn (nhãn trên quái, vòng từ, bảng chiêu).

## Nguồn asset

1. **Sprite nhân vật (quái, trùm, NPC thoại) — nguồn chính: PixelLab** (AI pixel art, api.pixellab.ai), tài khoản
   HeroX. PNG đơn, màu trung tính để runtime tint MULTIPLY theo chủ đề level; trùm dùng chung PNG làm chân dung thoại.
   - Công thức tạo lại nằm trong `tools/pixellab/art-recipes.json`: mỗi asset ghi `id`, `path`, `prompt`, `seed`,
     `size`, `directions`, `animations`, `reference` (ảnh phong cách `style-target.png`), `createdAt`. Seed cố định để
     sinh lại ra đúng ảnh.
   - Quy trình: khai báo job trong `tools/pixellab/jobs.mjs` / `jobs-chapters-2-5.mjs` (dựng qua `job-factory.mjs`),
     chạy `node tools/pixellab/generate.mjs` (gọi `api-client.mjs`). Lệnh bỏ qua asset đã có; chỉ sinh job mới.
   - Prompt bắt buộc có: `color-neutral palette`, `top-down 3/4 pixel art`, `clean readable silhouette`,
     `transparent background`. Kích thước: quái thường 64×64, trùm 128×128, chân dung 64×64 hoặc 96×96.
   - Đọc `PIXELLAB_API_KEY` từ env khi gọi API. **Không** đưa token vào repo, chat, log hay báo cáo.
   - Hết quota: dùng tạm asset đã có, bổ sung sau; không đổi hero sang PixelLab.
2. **Tile map — khung Kenney, art bản đồ ngoài trời PixelLab** (từ 2026-11-25).
   - Khung: Kenney (https://kenney.nl, CC0) Tiny Town + Tiny Dungeon, ảnh gốc 16 px ở `assets/tiles/kenney/` (kèm
     `LICENSE-*.txt`), phóng ×2. Bảng tên ô `KENNEY_TILES` là hợp đồng tên ô; thiếu ảnh PixelLab thì lùi về ô Kenney.
   - Nhà, cây, tháp, cổng, mặt tiền nhà nguyện: ảnh tĩnh PixelLab pixflux (job `tools/pixellab/jobs-map-structures.mjs`,
     ảnh ở `assets/tiles/pixellab/`), phong cách high fantasy đổ bóng chi tiết như nền sân trận. Ảnh cắt thành ô 32 px
     vẽ 1:1, thay ô cùng tên qua `client/scripts/chapter-1/pixellab-tile-overrides.mjs`; vùng sáng cửa sổ/cửa khai bằng
     `glowRects` theo toạ độ ảnh nguồn. Ảnh trả nền đục thì bật `clearBackground`, không sinh lại.
   - Nền cỏ ↔ đường đất và tường thành ↔ cỏ: tileset Wang PixelLab v2 `/create-tileset` (16 ô, chọn theo 4 góc, ghép ở
     `client/scripts/lib/grass-path-autotile.mjs`). Mỗi lần sinh tốn 1 lượt. PixelLab có thể vẽ ngược lower/upper so
     với mô tả: ghi trường `terrain` trong file `.json` cạnh sheet theo ảnh thật.
   - **Không** chạy `tools/palette-harmonize.mjs` lên asset Kenney (khử bão hoà, làm lệch tông ánh sáng).
3. **Ngoại lệ được giữ:** hero LPC và hiệu ứng pixelfx (MIT) đang có, vì đã gắn hoạt ảnh trận.
   - Hero giữ LPC: thử PixelLab animate hướng lên/trái mất silhouette (khối áo choàng) và giật, thay sẽ regress chất
     lượng (quyết định gate 3, 2026-11-23). Xem mục Hero.
   - Công thức ghép hero ở `prototypes/style-preview/tools/build_style_assets.py`: kiểu "Crusader" của Sorthen.
   - Chỉ dùng layer LPC có ít nhất một license không phải GPL.
4. Mỗi asset có dòng credit (nguồn, license, công cụ, ngày) trong `assets/credits.json`, rồi chạy
   `node tools/build-credits.mjs` để sinh `assets/CREDITS.md`.

## Sửa map chương 1

- Map, atlas `assets/tilesets/chapter-1.png`, bảng tên tile `chapter-1-tiles.json`, vùng sáng `chapter-1-glow.json`
  sinh bằng `npm run generate:chapter-1 -w @herox/client`, sau đó `node tools/build-credits.mjs`.
- Bố cục level: `client/scripts/chapter-1/levels.mjs`; bảng tile Kenney: `client/scripts/chapter-1/kenney-atlas.mjs`.
- Level ngoài trời dựng bố cục tự nhiên bằng `organicOps` (`client/scripts/chapter-1/organic-layout.mjs`): đường uốn
  qua điểm mốc, cụm cây, mép rừng răng cưa, tự chừa lề quanh entity và đường. Rải theo `hashNoise` nên vẫn tất định.
- Tên ô mới chỉ thêm ở cuối `KENNEY_TILES`; ô Kenney dùng ở nhiều nơi (vd. `stone_slab` vừa là sàn vừa là giữa tháp)
  phải tách tên riêng trước khi ghi đè ảnh.
- **Không sửa tay file `.ldtkl`**: lần sinh sau ghi đè. Script tất định, chạy lại ra đúng file cũ.

## Hero

- **Hiệp sĩ Thánh Ngôn:** giáp tấm bạc, mũ kín có mặt nạ, áo khoác trắng thập tự đỏ, **khiên thập tự lớn** (người dùng yêu cầu giữ), áo choàng đỏ, kiếm dài.
- Phải đọc ra "bá khí": dáng cao, vai rộng. Tránh đầu to, mũ tròn, tỉ lệ chibi. Người dùng đã chê bản LPC armet là "trông hài".
- Hoạt ảnh tối thiểu: đứng, đi, chém, niệm phép, trúng đòn, chết.
- Ngoại trang (Xưởng may) là biến thể của cùng hero: đổi áo choàng, hoạ tiết khiên, mũ, màu giáp. Giữ nguyên dáng và khung để hoạt ảnh khớp.

## Trình bày trong game

- **Ánh sáng** (`client/src/render/golden-hour-atmosphere.ts`, preset ở `lighting-presets.ts`): xem bảng preset phía trên.
  - Đổi cỡ màn hình: dải màu, quầng, tia sáng được tạo lại theo cỡ mới.
  - Phần tĩnh (dải màu, tia nắng, bóng nhà, cửa sổ) vẽ một lần; mỗi khung chỉ dời quầng sáng động và cuộn tia nắng.
  - Quality thấp (`dynamicLightingEnabled = false`) tắt toàn bộ lớp phủ; art Kenney vẫn đọc rõ.
  - Tàn lửa bay lên ở hầm trùm.
- **Chữ HUD và hội thoại:** chữ tiếng Việt cần sắc nét.
  - Tiêu đề dùng `Cambria, 'Times New Roman', serif`. Georgia thiếu glyph ố, ề, ầ nên vỡ dấu.
  - Thân chữ dùng font sans của hệ thống.
- **Trận:** sân nhìn dọc (6×11 ô) dựng từ tile atlas chương 1, phóng ×2, theo chủ đề trận (`battle-arena-layout.ts`).
  - Cánh đồng (cây, rào, bia tập bắn) cho trận dã ngoại, làng (nhà, giếng, đe) cho lò rèn, hầm có tàn lửa cho trùm;
    mỗi sân một preset ánh sáng (nắng / hoàng hôn / trăng) và quầng sáng theo nhân vật.
  - Hero đứng dưới nhìn lên (sheet LPC hàng hướng lên: đứng, chém, niệm, gục), quái đứng trên (sprite 64 px ×2, trùm 128 px ×1.5).
  - Đòn trúng có lao tới, giật lùi, loé trắng; đòn kết khựng hình 80 ms.
  - Hiệu ứng pixelfx giữ nguyên góc vẽ, không xoay, chạy chậm còn 0,6 lần. Đòn trúng chờ hiệp sĩ lao tới (220 ms) hoặc
    phép nguyền bay tới quái (luồng sáng tím 520 ms); đòn quái trúng sau khi quái lao xuống (260 ms).
  - Xem chiêu: sau mỗi đáp án đúng, đồng hồ trận đứng 1,1–1,8 s (theo loại chiêu) và chưa nhận đáp án mới.
  - Vào trận: bản đồ rung, loé, phóng to rồi tối dần (550 ms), màn trận hiện dần (450 ms). Asset trận tải ngầm sau
    khi vào bản đồ nên không đứng hình; bảng "Đang vào trận…" chỉ hiện nếu chờ quá 0,7 s.
- **Quái lang thang:** Misty_Fields có 7 quái (sau mốc tới làng) đứng nhún, bước quanh chỗ sinh, có quầng sáng nhỏ.
  Chạm vào là vào trận dã ngoại; trận xong con đó tan đi, 30 s sau sinh con mới (`roaming-monsters.ts`).
  - Chuỗi đúng: bậc combo càng cao chiêu càng hoành tráng. Bậc 3 hiện tên chiêu; bậc 4 thêm hào quang và rung mạnh;
    bậc 5 có hitstop. Màu luồng phép theo hệ (`element` trong `assets/fx/fx-manifest.json`). Khiên có thêm hình khiên
    hiện quanh hiệp sĩ. Bậc combo quyết định chiêu nào được bốc (xem `docs/system-architecture.md`, mục Logic trận).
  - Trạng thái (đốt, độc, đóng băng, choáng, hút máu, hồi máu, tăng tốc, nguyền) hiện bằng hiệu ứng riêng và chữ nổi
    tiếng Việt trên quái hoặc hiệp sĩ.
  - Sân căn giữa khung 360×780 (lưới 384 px cắt đều 12 px hai mép); hero, quái cùng tâm ngang với thẻ đề.
  - HUD là DOM/CSS phủ trên canvas (`battle-hud.ts`, `battle-hud.css`): hàng trên là thẻ máu hiệp sĩ và quái,
    không có khung cố định giữa sân. Combo, sát thương, "Sai từ"… là chữ pixel nhỏ (monospace, viền 1 px) bật lên
    rồi tắt trong 0,7 s: trên đầu quái, dưới chân hiệp sĩ.
  - Dock dưới (dưới hiệp sĩ): hàng nút phụ, thẻ đề (emoji, nghĩa tiếng Việt, thanh thời gian), rồi ô gõ hoặc vòng từ
    2 cột × 3 hàng chiếm trọn chiều ngang; từ dài xuống dòng, không cắt.
  - Bảng kết quả hiện ở đáy, đè dock; chữ nổi và dock ẩn khi bảng mở.
  - Khung dọc (portrait-only): dock dưới né bàn phím ảo iOS qua `--keyboard-inset`.

## Bản xem tham chiếu (cũ)

`npx vite prototypes/style-preview --port 5190` mở bản xem phong cách gothic cũ (JS thuần). Không còn là chuẩn phong
cách map; code game ở `client/` không import từ đây.
