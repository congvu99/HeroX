---
title: "HeroX — game nhập vai học từ, chương 1 chơi trọn"
description: "Dựng game web Phaser đọc tiến độ học từ LingoBrain (DB chung, cùng domain /herox/), chiến đấu bằng gõ từ hoặc vòng từ, thành trì Lexhold, chương 1 chơi trọn trên PC và iPhone, deploy Docker."
status: in-progress
priority: P1
effort: 27d
branch: master
tags: [feature, frontend, backend, database, infra]
blockedBy: []
blocks: []
created: 2026-11-12
---

# HeroX — chương 1 chơi trọn

Nguồn quyết định: `plans/reports/brainstorm-261112-1044-herox-word-rpg.md` (đã chốt 2026-11-12).

## Outcome

Người dùng LingoBrain mở `https://<domain eng>/herox/`, vào thẳng game bằng phiên đăng nhập sẵn có. Cấp nhân vật, chiêu, vùng mở khoá khớp số từ đã học / đã thuộc. Người chơi là hiệp sĩ Thánh Ngôn đánh quỷ từ Vực Câm Lặng. Chơi trọn chương 1: mở đầu → tiền đồn Lexhold → Làng Sương Sớm bị quỷ chiếm → trùm Quỷ Bù Nhìn → kết chương, trên PC (bàn phím) và iPhone (cảm ứng). Chương 2–5 làm ở phase 10, sau khi chương 1 đạt nghiệm thu.

## Ràng buộc chính

- Không sửa code, schema, API của `D:\project\eng`. Ngoại lệ duy nhất cần duyệt: câu hỏi Q1 (service worker).
- HeroX chỉ `SELECT` trên `public.users`, `public.sessions`, `public.progress`, `public.words`; ghi ở schema `herox`.
- Không ghi ngược SRS của `eng`. Từ sai lưu ở `herox.word_misses`.
- Hệ chiêu, công thức, cân bằng tự thiết kế mới (không chép Lexoria).
- Tài nguyên có license dùng được: pixelfx (MIT), LDtk (MIT), sprite LPC/DCSS/0x72/Angels (CC0, CC-BY, CC-BY-SA), có file credits.
- Hình ảnh theo `docs/art-direction.md`: nhân vật, quái, trùm, chân dung bản chính vẽ bằng PixelLab theo ảnh mẫu; LPC/DCSS chỉ là hình tạm.
- Script SQL (role, quyền) chỉ viết ra, người dùng tự chạy, có backup trong `D:\DB-Backup\HeroX\...`.

## Non-goals

Nhiều người chơi, PvP, chat; mua bằng tiền thật; app native; sửa giao diện `eng`; AI sinh truyện động; tự viết engine.

## Kiến trúc

```
Trình duyệt (cùng origin với eng)
  /herox/            Phaser + TS (Vite build, base '/herox/'), SW riêng scope /herox/
     đọc localStorage 'eng.auth.v1'.token  ──Bearer──►  /herox/api/*
                                                          │
Container herox (Node 22, TS)                             ▼
  static /herox/*  +  API  ── role herox_app ──►  Postgres của eng
                                 SELECT public.users/sessions/progress/words
                                 ALL    schema herox (hero, citadel, inventory, story, word_misses)
```

Bằng chứng: token lưu ở `eng.auth.v1` (`eng/js/cloud-sync-engine.js:6`), băm SHA-256 hex (`eng/server/password-hashing-and-session-tokens.js` `hashToken`), phiên hết hạn trượt 180 ngày (`eng/server/auth-and-sync-routes.js:38-48`). "Đã học" = từ trong bộ có `state !== 'new'`; "đã thuộc" = `ivl >= 21` (`eng/js/srs-scheduler.js:155-165`). Record cũ hơn `srsEpoch` coi như đã xoá (`eng/js/sync-merge.js`).

## Phases

| # | Phase | Effort | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| 01 | [Khung dự án, công cụ, CI cục bộ](phase-01-project-scaffold.md) | 1.5d | — | completed |
| 02 | [Cầu dữ liệu: xác thực, đọc tiến độ, schema herox](phase-02-data-bridge-auth-progress.md) | 3d | 01 | completed |
| 03 | [Lõi game: scene, input, loader LDtk, di chuyển](phase-03-game-core-ldtk-movement.md) | 3d | 01 | completed |
| 04 | [Hệ chiến đấu bằng từ (logic thuần)](phase-04-word-combat-logic.md) | 3d | 02 | completed |
| 05 | [Chiêu, kỹ năng di chuyển, hiệu ứng pixelfx](phase-05-skills-movement-pixelfx.md) | 3d | 03, 04 | completed |
| 06 | [Thành trì Lexhold: nâng cấp, trang bị, ngoại trang](phase-06-citadel-lexhold.md) | 3d | 02, 03 | completed |
| 07 | [Nội dung chương 1: truyện, asset, map, quái, trùm](phase-07-chapter-1-content.md) | 5d | 05, 06 | pending |
| 08 | [iPhone, PWA, hiệu năng](phase-08-mobile-pwa-performance.md) | 2d | 07 | pending |
| 09 | [Docker, tích hợp proxy, E2E nghiệm thu](phase-09-docker-deploy-e2e.md) | 2d | 08 | pending |
| 10 | [Chương 2–5](phase-10-chapters-2-5.md) | 1.5d/chương (6d) | 09 | pending |

Phase 03 làm song song được với 02 (không chung file). Các phase còn lại tuần tự.

## Acceptance criteria (cả plan)

1. Đăng nhập `eng` → `/herox/` hiện đúng số từ đã học / đã thuộc khớp tab Tiến bộ của `eng` (test hợp đồng + E2E).
2. Học thêm từ ở `eng`, sync → mở lại HeroX thấy chiêu/vùng mới theo bảng mốc.
3. Gõ đúng từ → tung chiêu có hiệu ứng pixelfx; vòng từ chơi được chỉ bằng cảm ứng; chuỗi ≥ 3 từ ra combo.
4. Thành trì: nâng cấp trang bị, kỹ năng, đổi ngoại trang; lưu server, đổi máy còn nguyên.
5. Chương 1 chơi trọn từ mở đầu tới kết chương.
6. 60 fps PC tầm trung; ≥ 30 fps ổn định iPhone 12+ (Safari và PWA).
7. `docker compose up` chạy HeroX cạnh `eng`, dùng chung DB, healthcheck xanh.
8. Không có lệnh ghi nào vào bảng `public.*` (role chỉ có SELECT + test).
9. Chương 2–5 chơi trọn (phase 10).

## Rủi ro lớn

| Rủi ro | Xử lý |
|---|---|
| SW của `eng` scope `/` chặn `/herox/*`: cache-first, `ignoreSearch`, offline trả `index.html` của `eng` (`eng/sw.js:276-281`). API GET của HeroX có thể bị cache cũ | Q1. Mặc định trong plan: SW riêng scope `/herox/` + `clients.claim()`, API đọc dùng POST hoặc chờ SW HeroX điều khiển trang |
| Payload `progress` là hợp đồng nội bộ của `eng`, có thể đổi | Test hợp đồng bằng fixture; đọc phòng thủ (thiếu trường = 0) |
| Bàn phím ảo iPhone che màn | Vòng từ mặc định trên cảm ứng; ô gõ neo theo `visualViewport` |
| Phạm vi lớn | Chương 1 trọn vẹn trước; phase 10 nhân nội dung, không đổi hệ thống |

## Validation Log

### Phiên 2026-11-12
| Câu hỏi | Quyết định |
|---|---|
| Q1 SW của `eng` chặn `/herox/` | **Sửa `eng/sw.js` 1 dòng** bỏ qua `/herox/`, làm PR riêng ở repo `eng` (phase 08). Ngoại lệ duy nhất được duyệt khi chạm `eng`. |
| Ai chạy script role `herox_app` | Người dùng tự chạy; agent viết script + backup `D:\DB-Backup\HeroX\...` (phase 02). |
| Bộ sprite | Phong cách hiệp sĩ đánh quỷ địa ngục / thiên đàng, không khí kiểu Diablo. Isometric loại vì LDtk không hỗ trợ. Chốt **top-down 3/4, lưới 32px, độ phân giải logic 640x360**, hero dựng từ Universal LPC Generator (layer CC0/CC-BY/CC-BY-SA, loại layer chỉ có GPL), quái từ LPC + DCSS (CC0) + 0x72 (CC0), thiên thần từ "Angels" (CC-BY). Khảo sát: `plans/reports/researcher-261112-1102-dark-fantasy-sprite-packs.md`. |
| Cốt truyện | Đổi sang **thiên đàng / địa ngục**, giữ lõi "lời nguyền xoá chữ, bỏ ôn thì mất chữ" (chi tiết phase 07, 10). |
| Repo | **Private** → được dùng thêm gói trả phí hoặc cấm phân phối lại nếu license cho phép dùng trong game web; mỗi gói ghi license vào `CREDITS.md`. |
| Duyệt thoại chương 1 | Không dừng chờ duyệt; agent viết thoại rồi dựng map luôn, người dùng sửa sau khi chơi thử. |

### Phiên 2026-11-12 chiều: định hình phong cách
Bản xem: `prototypes/style-preview`, chạy bằng `npx vite prototypes/style-preview --port 5190`. Chuẩn hình ảnh ghi ở `docs/art-direction.md`.

| Câu hỏi | Quyết định |
|---|---|
| Hero LPC armet + khiên to | Người dùng chê "trông hài", muốn "bá khí". |
| Đích hình ảnh | Ảnh mẫu người dùng gửi (`prototypes/style-preview/public/assets/reference/style-target.png`): gothic tối, mưa, nến, vòng huyết, thập tự quân áo trắng khiên đỏ, tỉ lệ người thật. LPC/DCSS không đạt mức này. |
| Nguồn hình bản chính | **PixelLab**: AI vẽ pixel, có MCP cho Claude Code. Thay LPC/DCSS cho nhân vật, quái, trùm, chân dung; tileset làm thử rồi quyết. Người dùng tự đăng ký và thêm MCP. |
| Hero tạm (tới khi có PixelLab) | Kiểu "Crusader" của Sorthen ghép từ LPC: mũ bascinet + mặt nạ pigface, giáp tấm, giáp vai, **giữ khiên thập tự lớn**, áo choàng đỏ, kiếm dài. |
| Thông số | Giữ top-down 3/4, lưới 32px, 640x360. Nhân vật và quái khung 64px, trùm 128px. |

### Verification Results
- Claims checked: 8 (token key, hashToken, phiên 180 ngày, payload v1, rule đã học/đã thuộc, srsEpoch, phạm vi SW `eng`, license pixelfx)
- Verified: 8 | Failed: 0 | Unverified: 0 (LDtk hiện hành 1.5.3, kiểm ở phase 03)
- Tier: Full

## Câu hỏi mở

- Chân dung hội thoại: tạo bằng PixelLab (`create_portrait_character`) ở phase 07. Khung UI tiếp tục dựng bằng DOM/CSS theo bảng màu trong `docs/art-direction.md`.
- Đang chờ người dùng: (1) đăng ký PixelLab và thêm MCP; (2) hero kiểu Crusader tạm đã đủ "bá khí" chưa; (3) quái tự đánh sau 7–10 giây là nhanh hay chậm.
- Bản xem có thẻ riêng trên đầu từng quái (gõ từ của quái nào thì đánh quái đó). Trận ở `client/` (phase 05) đang hiện một đề chung giữa màn. Cần người dùng chọn 1 kiểu trước phase 07.
