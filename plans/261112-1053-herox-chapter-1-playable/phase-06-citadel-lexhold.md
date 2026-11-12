---
phase: 6
title: "Thành trì Lexhold: nâng cấp, trang bị, ngoại trang"
status: pending
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
| Xưởng may | Ngoại trang (chỉ hình): các bộ giáp hiệp sĩ dựng sẵn từ LPC (phase 07) | Mốc từ đã học/đã thuộc, không mua bằng vàng |
| Thư viện | Nhật ký truyện, danh sách từ đã thu, nghe phát âm qua `/api/tts` của `eng` nếu bật (chỉ GET, không đổi `eng`) | Mở sẵn |

Bản thân thành trì đổi sprite theo tổng số từ đã học (đổ nát → đang sửa → hồi sinh). Tài nguyên: vàng từ thắng trận; pha lê từ chuỗi ngày học và tỉ lệ nhớ 30 ngày (tính ở server, nhận tối đa 1 lần/ngày).

## Files to Create
- `shared/data/citadel-catalog.ts` — công trình, cấp, chi phí, điều kiện; `shared/data/equipment-catalog.ts`, `outfit-catalog.ts`.
- `shared/src/progression/citadel-rules.ts` — thuần: `canUpgrade(state, stats, target) → ok | reason`.
- `server/src/routes/citadel-routes.ts` — `POST /herox/api/citadel/upgrade`, `/equip`, `/outfit`, `/loadout`, `/daily-crystals`; transaction + `row_version` chống ghi đè khi 2 máy cùng thao tác (409 → client tải lại).
- `client/src/scenes/citadel-scene.ts` (dùng `world-scene` với map Lexhold) và `client/src/ui/panels/*-panel.ts` cho từng công trình (DOM overlay, chữ tiếng Việt sắc nét, dễ đọc trên iPhone).
- `shared/test/citadel-rules.test.ts`, `server/test/citadel-routes.test.ts`.

## Verification
- Test: không đủ vàng / không đủ từ → từ chối kèm lý do; nhận pha lê 2 lần/ngày → lần 2 bị chặn; 2 request song song cùng `row_version` → 1 thành công, 1 nhận 409.
- Thủ công: nâng cấp trên PC, mở iPhone (cùng tài khoản) thấy cùng kết quả.
