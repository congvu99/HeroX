# Khảo sát asset pixel art phong cách hiệp sĩ / địa ngục / thiên đàng (kiểu Diablo)

Ngày: 2026-11-12. Người dùng yêu cầu thay hướng Ninja Adventure. License đọc từ trang gốc, chỗ chưa kiểm có `[UNVERIFIED]`.

## Kết luận

- **Isometric kiểu Diablo không hợp LDtk.** LDtk tự mô tả "focused to side-views and top-downs (sorry no isometric for now!)" (https://deepnight.itch.io/ldtk). Chọn **top-down 3/4 orthogonal**, tạo không khí Diablo bằng palette tối, ánh sáng phủ, vignette, hiệu ứng pixelfx.
- Không có gói miễn phí nào phủ đủ hero có animation, nhiều bộ giáp, quỷ, trùm, thiên thần và tile thiên đàng.

## Ứng viên chính

| Gói | License | Góc nhìn / cỡ | Phủ | Thiếu |
|---|---|---|---|---|
| 0x72 DungeonTileset II — https://0x72.itch.io/dungeontileset-ii | CC0 | top-down 16px | hiệp sĩ, quỷ đỏ, imp, big demon, xương, zombie `[UNVERIFIED danh sách đủ]`, tile ngục | Không có animation tấn công/chết (tác giả xác nhận); không làng, không thiên đàng |
| DawnLike 16x16 — https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181 | CC-BY 4.0, credit DragonDePlatino + DawnBringer | top-down 16px, palette tối | quái, nhân vật, ngục, thị trấn | Animation 2 khung |
| Universal LPC Generator — https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator | Theo từng layer: CC0 / CC-BY / CC-BY-SA / GPL; có `CREDITS.csv` | top-down 3/4, khung 64x64 | đủ walk/slash/spellcast/hurt/death, rất nhiều bộ giáp (hợp ngoại trang) | Lệch tỉ lệ với tile 16px; layer CC-BY-SA/GPL ràng buộc license |
| Angels — https://opengameart.org/content/angels | CC-BY 3.0/4.0 | 3/4, 24x32 trở lên | thiên thần | Chỉ có walk/idle |
| Dungeon Crawl Stone Soup 32x32 — https://opengameart.org/content/dungeon-crawl-32x32-tiles | CC0 | top-down 32px | hàng trăm quái, quỷ, thiên thần, tile địa ngục | Sprite tĩnh |

Loại: Tiny Swords (cấm phân phối lại, phong cách sáng), Gothicvania (side-view), Pixel Crawler (license chưa đọc được), Kenney (phong cách sáng).

## Hai hướng khả thi

- **A. 16px: 0x72 + DawnLike.** Màn 480x270 thấy khoảng 30x17 ô. License an toàn. Animation tấn công/chết làm bằng code (vũ khí xoay, chớp trắng, tan biến); ngoại trang bằng đổi palette, ít biến thể. Thiên đàng: đổi màu tile đá/mây sang trắng-vàng.
- **B. 32px, hero LPC (chỉ layer CC0/CC-BY) + quái DCSS/0x72 phóng to.** Hero có đủ animation và nhiều bộ giáp thật. Phải nâng độ phân giải logic lên 640x360. Quái DCSS tĩnh, cần làm chuyển động bằng code. Công ghi credit nhiều hơn.

## Khoảng trống chung

Chân dung hội thoại và khung UI chưa có nguồn; tile thiên đàng phải tự đổi màu; palette giữa các gói cần chỉnh cho đồng bộ.
