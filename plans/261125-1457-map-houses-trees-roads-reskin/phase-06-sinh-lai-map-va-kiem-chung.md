---
title: "Phase 6: Sinh lại map và kiểm chứng"
status: done
priority: P1
effort: "2h"
dependencies: [4, 5, 7]
---

# Phase 6: Sinh lại map và kiểm chứng

## Overview

Sinh lại map 5 chương với atlas mới, so ảnh trước/sau, chạy kiểm thử, cập nhật tài liệu. Không tốn lượt.

## Implementation Steps

1. Chạy `npm run generate:chapter-1 -w @herox/client` và `generate-chapter-2..5`; chạy lần hai, `git diff --stat` phải
   không đổi gì thêm (tất định).
2. Kiểm `id` level/entity, portal không đổi: `git diff` trên `.ldtk` chỉ đụng lớp tile, không đụng entity.
3. Khởi động lại Vite, chụp 4 ảnh sau (thêm Misty_Chapel) ở đúng toạ độ phase 1 → `assets/after-<level>.png`; kiểm mắt sân trận làng (fallback layout dùng tên ô mái).
4. Kiểm vùng sáng cửa sổ ở preset `sunset` và `moonlight`.
5. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; e2e chương 1 nếu có sẵn script.
6. `node tools/build-credits.mjs`; test `asset-credits` pass.
7. Cập nhật `docs/art-direction.md` mục Nguồn asset: nhà/cây/đường đổi sang PixelLab, cơ chế ghi đè ô, độ hạt đã chọn,
   số lượt endpoint tileset tốn.
8. Dừng dev server do phase này khởi động.

## Todo

- [x] Sinh lại 5 chương, tất định (sinh 2 lần ra cùng file; lớp entity mọi `.ldtkl` giống HEAD)
- [x] Ảnh sau: Lexhold, Misty_Fields, Misty_Village, Misty_Chapel, Ash_Forest trong `assets/`
- [x] Kiểm vùng sáng: test `glowRects` pass; trace e2e soi được `sunny` (Lexhold, cánh đồng) và `moonlight` (nhà nguyện); `sunset` (làng) chưa có khung rõ trong trace
- [x] typecheck, lint, test (671/671), build pass; e2e chương 1 pixel-5 pass (3.2 phút)
- [x] Credits + `docs/art-direction.md` (Nguồn asset, Sửa map)

## Success Criteria

Toàn bộ acceptance trong plan.md đạt, kèm lệnh và output trong báo cáo hoàn thành.
