---
title: "battle-cast-moment-fx"
description: "Vòng từ bao quanh hiệp sĩ với khoảnh khắc ra chiêu, và đặt lại vị trí + hoà sáng hiệu ứng chiêu phía hiệp sĩ"
status: pending
priority: P1
effort: "M"
tags: [battle, fx, touch, ux]
created: 2026-11-25
---

# battle-cast-moment-fx

## Overview

Trận cảm ứng hiện dùng vòng từ là lưới DOM 2×3 ở dock đáy; chạm một từ là tung chiêu ngay, không có "khoảnh khắc". Hiệu ứng pixelfx phát đè giữa thân nhân vật (depth 20 > actor 10, không blend ADD) nên trông dán lên người, xấu và không thật.

Kế hoạch làm hai việc tách biệt về file, có thể làm nối tiếp:

1. **Vòng từ + khoảnh khắc** (`phase-01`): 6 từ xếp vòng cung quanh sprite hiệp sĩ. Chạm → từ khác mờ/bắn ra, từ chọn loé → vòng tan (~200–300ms) → hiệp sĩ mới ra chiêu. Khung hẹp/từ dài thì rớt về lưới 2×3 cũ.
2. **Đặt lại vị trí + hoà sáng FX** (`phase-02`): FX phía hiệp sĩ không dán giữa thân nữa — hào quang guard/empower nằm dưới/sau sprite, kiếm khí attack phía trước bay lên quái; bật blend ADD cho FX sáng. Giữ nguyên FX trúng đòn ở quái.

Quyết định đã chốt với người dùng:
- Khoảnh khắc vòng tan **chỉ áp cho vòng từ** (ring), không áp kiểu gõ.
- Vòng cung là mặc định, **rớt về lưới 2×3** khi khung hẹp hoặc từ quá dài.
- FX: **chỉ sửa phía hiệp sĩ** + bật ADD chung cho FX sáng; giữ FX trúng đòn ở quái.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Vòng từ bao quanh hiệp sĩ, chạm có nhịp "vòng tan" rồi mới ra chiêu, không lệch khi server replay | P1 |
| 2 | Khung hẹp/từ dài: rớt về lưới 2×3 cũ, nút vẫn ≥44px và dùng được bằng bàn phím/trình đọc màn hình | P1 |
| 3 | FX chiêu phía hiệp sĩ không đè giữa thân, hoà sáng (ADD) thay vì che mặt | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Vòng từ quanh hiệp sĩ và khoảnh khắc ra chiêu](./phase-01-start.md) | Pending |
| 2 | [Phase 2: Đặt lại vị trí và hoà sáng FX](./phase-02-dat-lai-vi-tri-va-hoa-sang-fx.md) | Pending |

Phụ thuộc: hai phase độc lập về file (phase 1 chạm `word-ring.ts`, `battle-scene.ts`, `battle-hud.css`; phase 2 chạm `battle-cues.ts`, `fx-player.ts`, `battle-scene.ts`). Điểm giao duy nhất là `battle-scene.ts` (`playCue`/`submit`), xử lý tuần tự để tránh sửa chồng.

## Success Criteria

- [ ] Ring: 6 từ hiện vòng cung quanh hiệp sĩ; chạm 1 từ → từ khác biến mất + từ chọn loé → vòng tan → hiệp sĩ ra chiêu, có khoảng ngắt ~200–300ms cảm nhận được, không gấp đôi/bỏ lượt.
- [ ] Trận không lệch khi server chạy lại: khoảng dừng "vòng tan" không đẩy delta vào `BattleSession` (log ghi theo thời gian trận giữ nguyên).
- [ ] Khung hẹp nhất (`pixel-5` 393px và `iphone-12`) hoặc từ dài: rớt về lưới 2×3; nút ≥44px; Enter/Space/VoiceOver chọn được.
- [ ] FX guard/empower hào quang nằm sau/dưới sprite hiệp sĩ (nhân vật đứng trong vầng sáng, không che mặt); FX attack ở phía trước bay lên quái; FX trúng đòn vẫn ở thân quái.
- [ ] FX sáng dùng blend ADD, nhìn hoà sáng chứ không phải ảnh dán đè.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` (gồm test cue mapper + combat ≥90% dòng), E2E ring (`pixel-5`/`iphone-12`) xanh.

<!-- slug: battle-cast-moment-fx -->
