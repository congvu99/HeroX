---
phase: 7
title: "Nội dung chương 1: truyện, asset, map, quái, trùm"
status: pending
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

## Asset (đã chốt hướng)
- **Hero:** Universal LPC Spritesheet Generator (https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator), khung 64×64, đủ walk / slash / spellcast / hurt / death. Chỉ lấy layer CC0, CC-BY, CC-BY-SA; **loại layer chỉ có GPL**. Xuất sẵn 6–10 bộ giáp hiệp sĩ cho ngoại trang (phase 06), mỗi bộ một sheet.
- **Quỷ / undead:** LPC (xương, quỷ có cánh nếu có) + Dungeon Crawl Stone Soup 32×32 (CC0) + 0x72 DungeonTileset II (CC0, phóng 2×). Sprite tĩnh hoặc ít khung thì thêm chuyển động bằng code (nhún, lao, chớp trắng, tan biến).
- **Tile:** LPC terrain (làng, nhà nguyện) + DCSS (ngục, địa ngục). Đồng bộ màu bằng một palette tối chung (script đổi màu trong `tools/`).
- **Chân dung hội thoại, khung UI:** chưa có nguồn. Tìm gói trả phí rẻ hoặc tự cắt mặt từ sprite LPC phóng to; gói trả phí phải hỏi người dùng duyệt chi phí trước khi mua.
- Repo private: gói trả phí dùng được nếu license cho phép dùng trong game web (file ảnh phát tới trình duyệt người chơi). Đọc license từng gói, ghi vào `CREDITS.md`.

## Files to Create
- `tools/lpc/hero-recipes.json` — danh sách layer cho từng bộ giáp (để dựng lại sheet khi cần).
- `tools/build-credits.mjs` — gộp `CREDITS.csv` của LPC + credit các gói khác thành `assets/CREDITS.md` và màn "Credits" trong game; test fail nếu file ảnh nào không có dòng credit.
- `tools/palette-harmonize.mjs` — đưa sprite/tile các gói về palette chung.
- `assets/sprites/**`, `assets/tiles/**`, `assets/CREDITS.md`.
- `assets/maps/lexhold.ldtk`, `assets/maps/chapter-1-misty-village.ldtk` (cánh đồng, làng, nhà nguyện, hang trùm).
- `shared/data/story/chapter-1.ts` — beat, hội thoại (tiếng Việt, kèm từ tiếng Anh được dạy), điều kiện, phần thưởng.
- `shared/data/enemies/chapter-1.ts` — chỉ số, đòn đánh, fx id, hành vi pha trùm.
- `client/src/story/dialog-runner.ts` — chạy beat, hộp thoại có chân dung, bỏ qua được.
- `client/src/story/quest-tracker.ts` — nhiệm vụ đang làm, HUD nhỏ.
- `server/src/routes/story-routes.ts` — `POST /herox/api/story/beat` ghi `story_progress` (idempotent), kiểm điều kiện beat ở server.

## Tasks
1. Viết toàn bộ thoại chương 1 rồi dựng map luôn (người dùng không duyệt trước, sửa sau khi chơi thử). Thoại để trong file dữ liệu để sửa không cần đụng code.
2. Dựng sheet hero + quỷ, chạy palette, sinh credits.
3. Dựng map LDtk theo kịch bản; entity trỏ đúng `dialogId`, `encounterId`.
4. Cân bằng: chơi thử với 3 hồ sơ (8 từ, 50 từ, 150 từ đã học), chương 1 mất 25–40 phút.
5. Lưu giữa chừng: thoát giữa chương, vào lại đúng beat.

## Verification
- Playthrough đầy đủ trên PC và iPhone giả lập không kẹt (checklist từng beat).
- Test: `story-routes` không cho nhảy beat khi chưa xong beat trước.
- Test credits: mọi file trong `assets/sprites`, `assets/tiles` có dòng credit; không có layer LPC license chỉ GPL.
