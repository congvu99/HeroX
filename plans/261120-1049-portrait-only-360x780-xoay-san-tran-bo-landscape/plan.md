---
title: "HeroX portrait-only (360×780), xoay sân trận, bỏ landscape"
description: "Chuyển toàn bộ game sang khung dọc 360×780 cho iPhone 14 Plus; xoay bố cục sân trận sang dọc (hiệp sĩ dưới / quái trên); bỏ hẳn hỗ trợ landscape."
status: pending
priority: P1
effort: "M (2–3 ngày)"
tags: [client, layout, portrait, battle]
created: 2026-11-20
---

# HeroX portrait-only (360×780), xoay sân trận, bỏ landscape

## Overview

Game hiện thiết kế **landscape 640×360** với nhắc xoay ngang. Người chơi mở trên iPhone 14 Plus (dọc, viewport CSS 430×932, DPR 3) bị canvas thu nhỏ, viền đen lớn, chữ nhắc xoay ngang.

Kế hoạch chuyển **portrait-only**: đổi logic resolution sang **360×780** (tỉ lệ ~9:19.5, sát iPhone 14 Plus), **xoay bố cục sân trận sang dọc** (hiệp sĩ dưới nhìn lên / quái trên), và **bỏ hẳn landscape** (xóa nhắc xoay, đổi E2E sang khung dọc).

Phạm vi chỉ ở gói `client/` (render, layout, HUD, input) và E2E config. **Không đụng** logic trận shared (`shared/src/combat`), API, art/tileset.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Logic resolution dọc 360×780; cơ chế zoom pixel-sắc giữ nguyên, hoạt động đúng trên DPR 3 | P1 |
| 2 | Xoay sân trận sang dọc: bố cục ASCII, vị trí/animation hiệp sĩ–quái, FX theo trục dọc | P1 |
| 3 | HUD trận + panel thành trì + joystick vừa khung dọc, chạm được mọi nút | P1 |
| 4 | Bỏ hẳn landscape: xóa `#rotate-hint`, media query portrait; E2E chạy khung dọc xanh | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Khung dọc & bỏ landscape](./phase-01-portrait-frame.md) | Done |
| 2 | [Phase 2: Xoay sân trận sang dọc](./phase-02-arena-vertical.md) | Done |
| 3 | [Phase 3: HUD, panel, joystick khung dọc](./phase-03-hud-panels.md) | Done |
| 4 | [Phase 4: E2E & kiểm thử toàn flow dọc](./phase-04-e2e-verify.md) | Done |

## Success Criteria

- [ ] `LOGICAL_WIDTH=360`, `LOGICAL_HEIGHT=780`; `npm run typecheck` + `npm run lint` sạch
- [ ] Trên emulator 430×932 (DPR 3): canvas lấp gần hết chiều cao, không còn viền đen lớn, không còn chữ nhắc xoay
- [ ] Sân trận hiển thị đủ hiệp sĩ (dưới) + quái (trên) trong khung dọc; animation chém/lao/giật/FX đi đúng trục dọc; không tràn/mất tile
- [ ] HUD trận + panel thành trì không bị cắt; mọi nút chạm được; joystick nửa dưới-trái hoạt động
- [ ] E2E (2 project đều khung dọc) xanh toàn bộ: đi map → vào trận → gõ/vòng từ → thắng → thành trì/lò rèn
- [ ] `npm test` + `npm run test:coverage` xanh; logic trận shared vẫn phủ ≥ 90%

## Ràng buộc & Non-goals

- **Không đổi gameplay/độ khó**: số ô camera world nhìn thấy giữ nguyên tầm ngang; chỉ thu nhỏ để vừa chiều dọc.
- **Không đụng** `shared/src/combat`, API, công thức cấp, art/tileset — chỉ client render/layout + E2E.
- **Không làm responsive 2 chiều**: portrait-only, desktop cũng hiển thị khung dọc (viền 2 bên chấp nhận được).
- Tái dùng sprite LPC sẵn có (đủ 4 hướng) — không vẽ lại.

## Rủi ro chính

| Rủi ro | Phase | Giảm thiểu |
|---|---|---|
| Sân trận 10×6 ngang không nhét vừa 360px → phải viết lại ASCII + đổi trục animation | 2 | Phase 2 cô lập; test `battle-arena-layout.test.ts` cập nhật theo kích thước mới |
| FX trận hiện chỉ lật ngang (`flipX`) — hướng dọc cần xoay 90°/đổi hướng | 2 | Task riêng; kiểm bằng E2E battle + mắt thường |
| HUD `--u` tính theo `LOGICAL_WIDTH`; đổi width ảnh hưởng mọi khoảng cách | 3 | Rà toàn bộ `.battle-hud` + panel CSS sau khi đổi width |
| Camera world zoom đổi → có thể lộ mép map chưa vẽ | 1 | Kiểm từng level map thử + chương 1 |

## Extension trace (biến thể kế tiếp)

Biến thể thực tế kế tiếp là **iPhone khác / Android dọc** (vd 393×852, 412×915). Hợp đồng giữ ổn định: logic resolution cố định 360×780, cơ chế `computeDisplayZoom` co giãn theo khung + DPR đã xử lý mọi tỉ lệ dọc. Không cần seam mới — chỉ cần zoom co đúng; Phase 1 chứng minh bằng cách kiểm trên ≥2 kích thước viewport dọc. Không dựng abstraction đa-thiết-bị (chưa có case thứ hai cần hướng khác).

<!-- slug: portrait-only-360x780-xoay-san-tran-bo-landscape -->
