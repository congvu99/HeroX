---
phase: 6
title: "Thành trì Lexhold: nâng cấp, trang bị, ngoại trang"
status: completed
priority: P1
effort: "3d"
dependencies: [2, 3]
---

# Phase 06: Thành trì Lexhold

## Goal
Map thành trì đi lại được; 4 công trình có giao diện nâng cấp; mọi chi phí, điều kiện kiểm ở server; lưu và đồng bộ đa máy.

## Công trình
| Công trình | Làm gì | Điều kiện mở / nâng |
|---|---|---|
| Lò rèn | Vũ khí, giáp: tăng sát thương, máu | Vàng + cấp lò rèn; cấp lò rèn cần số từ đã học |
| Tháp phép | Lên bậc chiêu, chọn 4 từ cho vòng từ, mở kỹ năng di chuyển | Pha lê; bậc 2 cần số từ đã thuộc |
| Xưởng may | Ngoại trang (chỉ hình): biến thể của hero (áo choàng, hoạ tiết khiên, mũ, màu giáp), cùng dáng và cùng khung (asset ở phase 07, xem `docs/art-direction.md`) | Mốc từ đã học/đã thuộc, không mua bằng vàng |
| Thư viện | Nhật ký truyện, danh sách từ đã thu, nghe phát âm qua `/api/tts` của `eng` nếu bật (chỉ GET, không đổi `eng`) | Mở sẵn |

Bản thân thành trì đổi sprite theo tổng số từ đã học (đổ nát → đang sửa → hồi sinh). Tài nguyên: vàng từ thắng trận; pha lê từ chuỗi ngày học và tỉ lệ nhớ 30 ngày (tính ở server, nhận tối đa 1 lần/ngày).

## Files to Create
- `shared/data/citadel-catalog.ts` — công trình, cấp, chi phí, điều kiện; `shared/data/equipment-catalog.ts`, `outfit-catalog.ts`.
- `shared/src/progression/citadel-rules.ts` — thuần: `canUpgrade(state, stats, target) → ok | reason`.
- `server/src/routes/citadel-routes.ts` — `POST /herox/api/citadel/upgrade`, `/equip`, `/outfit`, `/loadout`, `/daily-crystals`; transaction + `row_version` chống ghi đè khi 2 máy cùng thao tác (409 → client tải lại).
- `client/src/scenes/citadel-scene.ts` (dùng `world-scene` với map Lexhold) và `client/src/ui/panels/*-panel.ts` cho từng công trình (DOM overlay, chữ tiếng Việt sắc nét, dễ đọc trên iPhone). Panel theo bảng màu và font ở `docs/art-direction.md`; tham khảo `.hud-card`, `.dialog`, `.result` trong `prototypes/style-preview/src/style.css`.
- `outfit-catalog.ts` chỉ lưu id biến thể và mốc mở. Hình dùng hero tạm cho tới khi phase 07 có hình PixelLab, nên code không được phụ thuộc vào tên file LPC.
- `shared/test/citadel-rules.test.ts`, `server/test/citadel-routes.test.ts`.

## Verification
- Test: không đủ vàng / không đủ từ → từ chối kèm lý do; nhận pha lê 2 lần/ngày → lần 2 bị chặn; 2 request song song cùng `row_version` → 1 thành công, 1 nhận 409.
- Thủ công: nâng cấp trên PC, mở iPhone (cùng tài khoản) thấy cùng kết quả.

## Kết quả

### Đã làm
- Catalog ở `shared/src/data/` (`citadel-catalog.ts`, `equipment-catalog.ts`, `outfit-catalog.ts`), luật thuần `shared/src/progression/citadel-rules.ts` (`canUpgrade`, `applyCitadelAction`, `buildCitadelResponse`), hợp đồng `shared/src/citadel-contract.ts`.
- Lò rèn 5 cấp (vàng + số từ đã học), 6 món (3 vũ khí cộng sức chiêu, 3 giáp cộng máu), cấp món không vượt cấp lò. Bậc chiêu 2/3: 8/20 pha lê + 20/100 từ đã thuộc, sức chiêu ×1.15/×1.3. Ngoại trang 5 mẫu mở theo mốc từ. Pha lê/ngày = chuỗi ngày (tối đa 5) + thưởng tỉ lệ nhớ 30 ngày.
- Server: migration `003-citadel.sql` (`heroes.last_crystal_claim_day`, bảng `herox.skill_tiers`), `PgCitadelRepository` (transaction, `FOR UPDATE`, so `row_version`), `GET /citadel` + 5 route ghi; trang bị và bậc chiêu vào `BattleSetup`.
- Client: level `Lexhold` trong map thử (entity `Building`), công trình đổi hình theo giai đoạn thành trì, cửa ở cạnh dưới mở `CitadelScene` với panel DOM cho 4 công trình; gặp 409 tự tải lại và báo. Thư viện tìm từ và phát âm qua `/api/tts`.

### Khác plan
- Đường dẫn theo quy ước repo: catalog ở `shared/src/data/`, test đặt cạnh mã (`shared/src/progression/citadel-rules.test.ts`, `server/src/routes/citadel-routes.test.ts`) thay vì `shared/data`, `shared/test`, `server/test`.
- Thêm `GET /herox/api/citadel` (trả trạng thái kèm danh sách từ đã học, nhật ký) để client và máy thứ hai đọc lại.
- Kỹ năng di chuyển vẫn tự mở theo số trạng từ + giới từ (như phase 05); Tháp Phép chỉ hiển thị tiến độ, không có nút mở.
- `Lexhold` là level tạm trong `test-room.ldtk`; map thật ở phase 07. Ngoại trang chưa đổi hình hero (chờ hình PixelLab phase 07). Nhật ký truyện rỗng tới phase 07.
- Con số cân bằng (giá, mốc, thưởng) tự đặt, chỉnh được trong catalog.

### Kiểm chứng
- `npx vitest run` (44 file / 471 test), `npm run typecheck`, `npm run lint`, `npm run build`: đạt. Review: `plans/reports/code-reviewer-261112-1600-citadel-review.md` (0 critical; đã sửa H1, M1–M3, M5, L2–L6; M4 chờ duyệt).
- Test server (PGlite): thiếu vàng / thiếu từ → 422 kèm lý do; nhận pha lê lần 2 cùng ngày (kể cả đổi `utcOffset` lùi) → 422; 2 request song song cùng `rowVersion` → [200, 409]; GET lại như máy khác thấy cùng trạng thái; trang bị, bậc chiêu, vòng từ vào setup trận.
- Chromium thật (Vite dev, gateway cục bộ): vào Lexhold, chạm cửa mở đúng panel; nâng bậc chiêu trừ pha lê, nhận pha lê một lần, rèn kiếm tự mặc và cộng chỉ số; Escape trả lại bản đồ; khổ 390×844 hiển thị gọn, ô tìm 16 px.

### Chưa kiểm
- Kiểm thủ công PC + iPhone cùng tài khoản trên server thật.
- `FOR UPDATE` trên Postgres thật (PGlite chạy tuần tự nên test chỉ chứng minh nhánh so version).
- Phát âm thật qua `/api/tts` của LingoBrain (dev không có route này), và iOS có cho phát sau khi chờ mạng không.
