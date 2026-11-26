---
title: "npc-map-sprites"
description: "Nối hình cho 8 NPC đang hiện hình tạm ở chương 2–5, vẽ dáng toàn thân cho chained-soul và gate-seraph bằng 2 lượt PixelLab cuối"
status: completed
priority: P1
effort: "M"
tags: [art, pixellab, map, npc]
created: 2026-11-26
---

# npc-map-sprites

## Overview

Trên bản đồ thế giới, NPC lấy hình qua bảng `NPC_SPRITES` (`client/src/render/prop-sprites.ts:9`). Bảng chỉ có 6
`dialogId` của chương 1, nên **8/14 NPC ở chương 2–5 hiện hình tạm** dù ảnh đã có sẵn trong `assets/sprites/`:

| Level | dialogId | Ảnh có sẵn |
|---|---|---|
| Ash_Forest | `ash-warden` | `sprites/npc/forest-warden.png` (dialogId khác tên speaker) |
| Ash_Stag_Grove | `ash-stag` | `sprites/monsters/ash-stag.png` (128) |
| Saint_Catacomb | `crypt-warden` | `sprites/npc/crypt-warden.png` (bán thân) |
| Bishop_Sanctum | `nameless-bishop` | `sprites/monsters/nameless-bishop.png` (128) |
| Hellmaw | `chained-soul` | `sprites/npc/chained-soul.png` (bán thân) |
| Antonym_Throne | `antonym-demon` | `sprites/monsters/antonym-demon.png` (128) |
| Broken_Heaven | `gate-seraph` | `sprites/npc/gate-seraph.png` (bán thân trên bệ, như tượng) |
| Fallen_Sanctum | `fallen-angel` | `sprites/monsters/fallen-angel.png` (128) |

Ảnh NPC chương 2–5 sinh bằng job `portrait()` (`tools/pixellab/job-factory.mjs:56`) nên là ảnh bán thân: hợp làm chân
dung hộp thoại, nhưng đứng trên bản đồ thì lạ. Plan này dùng 2 lượt còn lại để vẽ dáng toàn thân cho 2 NPC lạ nhất,
ảnh bán thân giữ nguyên làm chân dung hộp thoại.

**Ngân sách:** còn **2/40 lượt** (đọc `/v2/balance` lúc 10:25 ngày 2026-11-26, gói trial, $0). Dùng đúng 2, không dự phòng.

| Phase | Lượt |
|---|---|
| 1 Nối hình 8 NPC | 0 |
| 2 Dáng toàn thân chained-soul, gate-seraph | 2 |
| 3 Kiểm chứng trong game | 0 |

## Quyết định đã chốt (người dùng, 2026-11-26)

- Phạm vi: nối hình 8 NPC + vẽ lại 2 NPC. **Không** làm tween sống động (thở, bóng chân, quay mặt) và **không** làm
  dấu "!" báo thoại mới trong plan này.
- 2 lượt dành cho `chained-soul` và `gate-seraph` (ảnh bán thân lạ nhất trên bản đồ). `crypt-warden` giữ ảnh bán thân
  (áo choàng trùm đầu, nhìn trên bản đồ vẫn chấp nhận được); `villager` xám trơn giữ nguyên.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Mọi NPC trên bản đồ 5 chương có hình thật, không còn hình tạm; test chặn tái phát khi thêm NPC mới | P1 |
| 2 | chained-soul và gate-seraph đứng trên bản đồ bằng dáng toàn thân, hộp thoại vẫn dùng chân dung bán thân | P2 |
| 3 | Không đổi id, toạ độ, kích thước entity, va chạm, hội thoại | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Start](./phase-01-start.md) | Done |
| 2 | [Phase 2: Vẽ dáng toàn thân chained-soul và gate-seraph](./phase-02-ve-dang-toan-than-chained-soul-va-gate-seraph.md) | Done |
| 3 | [Phase 3: Kiểm chứng trong game](./phase-03-kiem-chung-trong-game.md) | Done |

**Thứ tự:** 1 → 2 → 3. Phase 1 đứng riêng được (0 lượt); phase 2 hỏng thì vẫn giữ kết quả phase 1.

## Success Criteria

- [x] Test mới: mọi `Npc.dialogId` trong các map chương có đường dẫn ảnh và file tồn tại.
- [x] 14/14 NPC hiện hình thật trên bản đồ (ảnh chụp từng level ở phase 3).
- [x] chained-soul, gate-seraph: ảnh toàn thân được người dùng duyệt, hoặc ghi rõ lý do từ chối và giữ ảnh bán thân.
- [x] `npm run typecheck`, `npm run lint`, `npm test` pass; `/v2/balance` sau phase 2 = 0.

## Rủi ro

- Trùm (128 px) đứng làm NPC trên ô 32 px trông to. Tiền lệ: `scarecrow` ở chương 1 đã dùng ảnh trùm 128 px. Phase 3
  xem ảnh, nếu che lối đi thì báo người dùng, không tự thu nhỏ.
- pixflux hay ra tượng trên bệ, bóng đen, hình người không áo (xem memory dự án). Không còn lượt thử lại: ảnh hỏng thì
  giữ ảnh bán thân, không sinh lại.
- Vite không thấy file asset mới tới khi khởi động lại (`import.meta.glob`).

## Kết quả (2026-11-26)

- Phase 1: 8 khoá mới trong `client/src/render/npc-sprite-paths.ts`; test `npc-sprite-paths.test.ts` đỏ đúng 8 id trước khi thêm, xanh sau.
- Phase 2: người dùng duyệt cả 2 ảnh `chained-soul-figure.png`, `gate-seraph-figure.png`; `/v2/balance` sau khi chạy = 0/40.
- Phase 3: 8 ảnh `assets/after-<Level>.png`, texture không còn `placeholder-npc`; trùm 128 px không che cổng, hero vòng qua được.
  Không chụp được hộp thoại: NPC `chained-soul`/`gate-seraph` trên map lệch id kịch bản (`hell-soul`, `heaven-gate` chỉ mở tự động),
  `antonym-demon` cần mốc `fireWord`. Lỗi có từ trước, ngoài phạm vi plan.
