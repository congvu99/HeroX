---
title: "Phase 5: Zoom-punch theo đòn mạnh/combo"
status: done
---

# Phase 5: Zoom-punch theo đòn mạnh/combo

## Overview

Trận đã có camera `shake` theo đòn (cue `shake` strong/light). Thêm một nhấn zoom ngắn ("punch": zoom vào nhanh rồi trả về) cho đòn mạnh/combo bậc cao, để đòn dứt điểm có sức nặng. Độc lập với các phase khác.

## Context (đã xác minh)

- `battle-scene.ts:486-490`: cue `shake` → `cameras.main.shake(durationMs, intensity)`, đã guard `screenShakeEnabled === false`.
- `battle-scene.ts:483`: cue `hitstop` → `actors.hitstop` (đã có hitstop).
- `battle-scene.ts:387`: `cast` có `comboTier` (`showcaseBonusMsFor(event.comboTier)`), `SHOWCASE_MS[event.skill]` — đã biết bậc combo và loại chiêu.
- `enterBattle` ở world-scene dùng `camera.zoomTo` — cùng API dùng được cho punch.

## Requirements

- [ ] Khi có đòn mạnh/combo bậc cao (xác định qua cue sẵn có — ưu tiên dựa trên `shake.strong` hoặc `comboTier`, chọn nguồn tín hiệu đã có, **không thêm event mới** nếu tránh được): camera `zoomTo(zoom nhẹ, in nhanh)` rồi `zoomTo(1, out)` để trả về.
- [ ] Biên độ zoom nhỏ (vd ×1.05–1.1), tổng thời gian ngắn (~150–250ms), không làm mất khung thiết kế 360×780 (trận `centerOnDesignFrame`).
- [ ] Guard `screenShakeEnabled === false` → tắt zoom-punch (cùng cờ với shake, vì cùng nhóm "camera động").
- [ ] Trả zoom về đúng 1 sau khi xong; không kẹt zoom khi kết trận/đổi trận giữa chừng.

## Implementation Steps

1. Xác định điểm phát: dùng ngay nhánh cue `shake` khi `cue.strong` (và/hoặc `cast` combo cao). Chọn một nguồn để tránh double-trigger.
2. Viết helper `punchZoom(camera, scale, inMs, outMs)` trong battle-scene (hoặc cạnh hệ camera trận); gọi khi điều kiện đạt và `screenShakeEnabled !== false`.
3. Đảm bảo khi `showEnd`/chuyển cảnh, zoom được reset về 1 (tránh kẹt).
4. Kiểm tay: đòn thường chỉ shake; đòn mạnh/combo có nhấn zoom ngắn; tắt shake → không zoom.

## Todo

- [ ] Helper `punchZoom` + chọn nguồn tín hiệu đòn mạnh/combo (không thêm event mới nếu tránh được)
- [ ] Gọi khi điều kiện đạt, guard `screenShakeEnabled`
- [ ] Reset zoom khi kết/đổi trận
- [ ] Kiểm tay + typecheck/lint/test xanh

## Success Criteria

- Đòn mạnh/combo có nhấn zoom ngắn rồi về bình thường; đòn thường không.
- Tắt shake trong quality → không zoom-punch.
- Không kẹt zoom sau trận/đổi trận.

## Rủi ro & Rollback

- Rủi ro: zoom che mất rìa sân hoặc double-trigger với shake → biên độ nhỏ, chọn một nguồn tín hiệu, test đổi/kết trận. Rollback: gỡ `punchZoom` và lời gọi.
