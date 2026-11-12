---
phase: 7
title: "Nội dung chương 1: truyện, asset, map, quái, trùm"
status: in-progress
priority: P1
effort: "5d"
dependencies: [5, 6]
---

# Phase 07: Chương 1 — Làng Sương Sớm bị chiếm

## Goal
Chơi trọn chương 1 từ mở đầu tới kết chương, có hội thoại, nhiệm vụ, quỷ thường, quỷ tinh anh, trùm Quỷ Bù Nhìn, phần thưởng mở công trình đầu tiên, trong không khí tối kiểu Diablo.

## Bối cảnh (đã chốt 2026-11-12)
Thế giới tồn tại nhờ **Thánh Ngôn**: chữ do thiên đàng ban xuống. Từ **Vực Câm Lặng** dưới đáy địa ngục, quỷ trồi lên nuốt chữ: thứ gì mất tên thì mục rữa, người mất tiếng thành vỏ rỗng. Người chơi là **hiệp sĩ Thánh Ngôn** cuối cùng. Mỗi từ học được ngoài đời (ở LingoBrain) là một chữ thánh khôi phục, thành sức mạnh phép và vật liệu cho tiền đồn **Lexhold**. Lõi thông điệp: không ôn thì mất chữ, trùm cuối là thiên thần sa ngã đã quên hết chữ.

## Kịch bản chương 1
1. **Mở đầu:** hiệp sĩ tỉnh dậy trong tiền đồn Lexhold đổ nát, chuông nhà thờ câm. Tu sĩ Giữ Thư (NPC dẫn đường) giải thích Thánh Ngôn. Chọn tên, giới tính, bộ giáp khởi đầu (LPC).
2. **Hướng dẫn:** trận đầu với imp ở cổng tiền đồn, 8 từ cố định (hoặc từ đã học nếu đủ), dạy gõ từ / vòng từ / combo.
3. **Làng Sương Sớm:** sương đỏ, dân làng thành vỏ rỗng, cửa không mở vì mất chữ `door`. 3 nhiệm vụ: quét quỷ ở cánh đồng, tìm 3 mảnh Thánh Ngôn trong nhà nguyện, cứu thợ rèn (mở lò rèn).
4. **Quỷ:** 3 loại thường (imp, xương khô, quỷ nhỏ) + quỷ tinh anh sinh từ từ yếu của người chơi.
5. **Trùm Quỷ Bù Nhìn:** 2 pha; pha 2 dựng khiên lửa, chỉ chuỗi combo mới phá được (dạy ghép chuỗi).
6. **Kết chương:** chuông nhà thờ ngân lại, dân làng có lại tiếng nói, Lexhold lên cấp 1, cổng xuống Rừng Tro mở ở mốc 100 từ đã học.

## Asset (cập nhật 2026-11-12 chiều, chuẩn ở `docs/art-direction.md`)
Đích hình ảnh là ảnh mẫu `prototypes/style-preview/public/assets/reference/style-target.png`. Bản chính vẽ bằng **PixelLab**; LPC/DCSS chỉ là hình tạm, chạy được khi chưa có PixelLab.

**Điều kiện bắt đầu phần asset:** người dùng đã đăng ký PixelLab và thêm MCP (`claude mcp add pixellab --transport http https://api.pixellab.ai/mcp --header "Authorization: Bearer <TOKEN>"`). Chưa có thì làm phần thoại, map, logic bằng hình tạm, phần asset để sau.

| Nhóm | Nội dung | Khung | Hoạt ảnh |
|---|---|---|---|
| Hero | Hiệp sĩ Thánh Ngôn: giáp tấm bạc, mũ kín có mặt nạ, áo trắng thập tự đỏ, **khiên thập tự lớn**, áo choàng đỏ, kiếm dài | 64 | đứng, đi, chém, niệm phép, trúng đòn, chết; 4 hướng |
| Quỷ thường | tiểu quỷ (imp), ghoul, xương kỵ sĩ, chó địa ngục | 64 | đi, đánh, trúng đòn, chết |
| Quỷ tinh anh | quỷ đỏ sinh từ từ yếu của người chơi | 64–96 | như trên |
| Trùm | Quỷ Bù Nhìn, 2 pha (pha 2 có khiên lửa) | 128 | đứng, đánh, chiêu pha 2, chết |
| NPC | Tu sĩ Giữ Thư, thợ rèn, dân làng vỏ rỗng | 64 | đứng, đi |
| Chân dung | hero, Tu sĩ Giữ Thư, thợ rèn, trùm | 64–96 | không |
| Tile | đường lát đá, đất bùn, tường đổ, nhà nguyện, nghĩa địa, cổng sắt, khe dung nham | 32 | không |

- Mọi lần tạo đều dùng ảnh mẫu làm chuẩn phong cách và khoá bảng màu ở `docs/art-direction.md`. Tạo hero trước, người dùng duyệt hero rồi mới tạo hàng loạt.
- Ngoại trang (phase 06): làm các biến thể của chính hero (đổi áo choàng, khiên, mũ, màu giáp), giữ nguyên dáng và khung để hoạt ảnh khớp.
- Chuyển động thêm bằng code cho quái ít khung: nhún, lao, chớp trắng, tan biến.
- Hình tạm: hero lấy công thức LPC trong `prototypes/style-preview/tools/build_style_assets.py`, chỉ dùng layer LPC có license không phải GPL; quái và tile lấy từ DCSS (CC0).
- Repo private: gói trả phí và asset PixelLab dùng được nếu điều khoản cho phép dùng trong game web. Ghi từng nguồn vào `CREDITS.md`.

## Files to Create
- `tools/pixellab/art-recipes.json` — mỗi asset ghi prompt, seed, kích thước, số hướng, hoạt ảnh, ảnh tham chiếu, ngày tạo, để tạo lại được. Không ghi token.
- `tools/pixellab/import-pixellab.mjs` — đưa kết quả PixelLab về atlas ≤ 2048 trong `assets/sprites/**`, sinh JSON khung cho Phaser.
- `tools/lpc/hero-recipes.json` — công thức hero tạm (port từ `prototypes/style-preview/tools/build_style_assets.py`), dùng khi chưa có hình PixelLab.
- `tools/build-credits.mjs` — gộp credit từ LPC `CREDITS.csv`, DCSS, pixelfx, PixelLab (từ `art-recipes.json`) và các gói khác thành `assets/CREDITS.md` và màn "Credits" trong game. Test fail nếu có file ảnh không có dòng credit.
- `tools/palette-harmonize.mjs` — đưa sprite và tile về bảng màu chung (bắt buộc với hình tạm, kiểm thêm với hình PixelLab).
- `assets/sprites/**`, `assets/tiles/**`, `assets/CREDITS.md`.
- `assets/maps/lexhold.ldtk`, `assets/maps/chapter-1-misty-village.ldtk` (cánh đồng, làng, nhà nguyện, hang trùm).
- `shared/data/story/chapter-1.ts` — beat, hội thoại (tiếng Việt, kèm từ tiếng Anh được dạy), điều kiện, phần thưởng.
- `shared/data/enemies/chapter-1.ts` — chỉ số, đòn đánh, fx id, hành vi pha trùm.
- `client/src/story/dialog-runner.ts` — chạy beat, hộp thoại có chân dung, bỏ qua được.
- `client/src/story/quest-tracker.ts` — nhiệm vụ đang làm, HUD nhỏ.
- `server/src/routes/story-routes.ts` — `POST /herox/api/story/beat` ghi `story_progress` (idempotent), kiểm điều kiện beat ở server.

## Tasks
1. Viết toàn bộ thoại chương 1 rồi dựng map luôn (người dùng không duyệt trước, sửa sau khi chơi thử). Thoại để trong file dữ liệu để sửa không cần đụng code.
2. Tạo hero bằng PixelLab, chờ người dùng duyệt, rồi tạo quỷ, trùm, NPC, chân dung, tile. Chạy palette, sinh credits. Chưa có PixelLab thì dùng hình tạm và ghi rõ trong báo cáo phase.
3. Dựng map LDtk theo kịch bản; entity trỏ đúng `dialogId`, `encounterId`.
4. Cân bằng: chơi thử với 3 hồ sơ (8 từ, 50 từ, 150 từ đã học), chương 1 mất 25–40 phút.
5. Lưu giữa chừng: thoát giữa chương, vào lại đúng beat.

## Verification
- Playthrough đầy đủ trên PC và iPhone giả lập không kẹt (checklist từng beat).
- Test: `story-routes` không cho nhảy beat khi chưa xong beat trước.
- Test credits: mọi file trong `assets/sprites`, `assets/tiles` có dòng credit; không có layer LPC license chỉ GPL; mọi asset PixelLab có recipe trong `art-recipes.json`.
- So hình với ảnh mẫu: chụp màn làng, nhà nguyện, trận thường, trận trùm, đặt cạnh ảnh mẫu, người dùng duyệt.

## Tiến độ (2026-11-12 17:30, khoảng 80%)

### Đã làm
- Shared:
  - Truyện chương 1 (`shared/src/data/story/chapter-1.ts`): 12 mốc, thoại, nhiệm vụ, khoá trận / cổng / công trình.
  - Luật mốc ở `shared/src/story/`.
  - 5 loại quỷ và trùm 2 pha có khiên lửa (chỉ combo ×3 xuyên được).
- Server:
  - `GET /herox/api/story` và `POST /herox/api/story/beat`, có kiểm thứ tự mốc và bằng chứng thắng trong `encounter_victories` (migration 004).
  - Khoá lò rèn tới khi có mốc `smith-rescued`.
- Client:
  - Tạo nhân vật (tên, giới tính); tải tiến độ truyện lúc vào game.
  - Hộp thoại DOM có chân dung, bỏ qua được, thử thách gõ hoặc chạm chữ.
  - Bảng nhiệm vụ.
  - NPC, rương, trận, cổng theo mốc; hiển thị khiên lửa trong trận.
  - Hero LPC đi bộ 4 hướng; mục "Ghi công hình ảnh" trong Thư viện.
- Asset và map:
  - Map 5 level.
  - Hình tạm DCSS/LPC đã chỉnh bảng màu.
  - `tools/palette-harmonize.mjs`, `tools/build-credits.mjs`, `tools/lpc/hero-recipes.json`, `tools/pixellab/art-recipes.json` (rỗng).
  - `assets/credits.json`, `assets/CREDITS.md` và test credits.
- Chơi thử tự động (Playwright, chế độ dev, PC): đi hết 12/12 mốc tới kết chương. Sửa 3 lỗi phát hiện khi chơi:
  - thân chắn NPC/rương lệch 32 px nên không nói chuyện được;
  - bảng nhiệm vụ đè lên màn trận;
  - thoại cửa nhà nguyện và thợ rèn mở trước khi đủ mốc (có test bất biến chặn lại).
- Kiểm tra: typecheck và eslint sạch, 553/553 test, `npm run build` qua.

### Lệch so với plan
- Lexhold nằm chung `assets/maps/chapter-1-misty-village.ldtk`, không tách `lexhold.ldtk`, vì cổng nối giữa 2 file LDtk chưa được hỗ trợ.
- Chưa có PixelLab: toàn bộ hình là hình tạm, chưa có `tools/pixellab/import-pixellab.mjs`.

### Việc còn lại
Lỗi từ code review high: chi tiết ở `plans/reports/code-reviewer-261112-1730-chapter-1-review.md`. Hẹn sửa sau.
- [ ] Mốc trận bị mất khi gửi kết quả trận lỗi mạng nhưng server đã lưu thắng (`client/src/scenes/battle-scene.ts`).
- [ ] Màn tạo nhân vật kẹt khi server đã tạo nhưng client hết giờ chờ: lỗi 409 phải tải lại `/me` (`client/src/scenes/boot-scene.ts`).
- [ ] Người chơi cũ đã nâng lò rèn bị khoá lò rèn: cần chốt có ghi sẵn mốc `smith-rescued` cho họ không.
- [ ] Server chặn bắt đầu trận truyện khi chưa đủ mốc (`server/src/routes/battle-routes.ts`).
- [ ] Khoá lò rèn khoá cả thao tác trang bị; mã công trình dùng kiểu `BuildingId` thay vì chuỗi tự do.
- [ ] `openChest` không hiện lại bảng nhiệm vụ khi hộp thoại đang mở.
- [ ] Bỏ dữ liệu lặp:
  - danh sách trùm ở màn trận suy ra từ dữ liệu quái;
  - hình Quỷ Bù Nhìn đang tải thành 2 texture;
  - gom cách đổi kết quả ghi mốc ra câu báo lỗi;
  - gom câu "phiên đăng nhập hết".

Chơi thử và cân bằng (cần người dùng):
- [ ] Chạy với server thật và đăng nhập LingoBrain. Thoát giữa chương, vào lại đúng mốc.
- [ ] Chơi trên iPhone, dùng vòng từ.
- [ ] Cân bằng với 3 hồ sơ 8/50/150 từ, mục tiêu 25–40 phút.
- [ ] So hình với ảnh mẫu, người dùng duyệt.

Hình bản chính:
- [ ] Làm hình bằng PixelLab khi đã có MCP.

### Câu hỏi mở phase 07
1. Người chơi dưới 8 từ đã học bị server ép vào trận hướng dẫn ở mọi trận nên kẹt sau cổng nam. Giữ (bắt học đủ 8 từ) hay sửa?
2. Đánh xong trùm, hình Quỷ Bù Nhìn vẫn đứng trong hang và che hero. Ẩn đi hay thay bằng đống tro?
3. Map khá tối, nhất là hang trùm. Tăng sáng không?
4. Cánh cửa nhà nguyện (NPC) chiếm nửa lối vào nhà nguyện. Dời sang bên cạnh không?
5. Trùm dùng hình balrug của DCSS. Giữ hay đổi sang fiend?
6. Cỡ hình: quái 64, tinh anh 96, trùm 128, ô hero LPC 192. Màn trận co quái về 72 px, trùm 120 px. Giữ như vậy?
