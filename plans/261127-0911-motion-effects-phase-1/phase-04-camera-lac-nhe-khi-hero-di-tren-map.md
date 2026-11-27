---
title: "Phase 4: Camera lắc nhẹ khi hero đi"
status: done
---

# Phase 4: Camera lắc nhẹ khi hero đi

## Overview

Thêm dao động camera rất nhẹ (bob) khi hero đang di chuyển trên map, tạo cảm giác bước chân. Đứng yên thì camera tĩnh hẳn. Độc lập với các phase khác.

## Context (đã xác minh)

- `world-scene.ts:255`: `camera.startFollow(hero, true)` — camera đã bám hero mượt.
- `world-scene.ts:545` `moveHero`: biết hero đang đi hay đứng (`moving`), hướng, có xử lý lướt/thuấn bộ.
- Camera đã dùng `shake` lúc vào trận (`enterBattle`); nhưng `shake` là rung giật, không hợp cho bob liên tục — nên dùng offset tuần hoàn qua `setFollowOffset` thay vì `shake`.
- Có `screenShakeEnabled` trong `QualityProfile` để tôn trọng người nhạy chuyển động.

## Requirements

- [ ] Khi hero đang đi (`moving === true`), camera bob biên độ rất nhỏ (vài px) theo hàm sin thời gian, qua `camera.setFollowOffset(x, y)`; đứng yên thì trả offset về 0 mượt.
- [ ] Biên độ/đần số là constant, đặt tinh tế (không gây say xe). Khi lướt/thuấn bộ có thể tăng nhẹ hoặc giữ nguyên — chọn giữ nguyên để KISS.
- [ ] Tôn trọng `screenShakeEnabled === false` → tắt bob (người nhạy chuyển động). Đọc profile hiện có qua controller đã inject trong scene.
- [ ] Không đụng `startFollow`/bounds hiện có; chỉ cộng offset.

## Implementation Steps

1. Trong `world-scene.ts`, thêm trạng thái pha bob và cập nhật trong `update`/`moveHero`: nếu `moving` và cho phép, `setFollowOffset(0, sin(t)*AMP)` (bob dọc nhẹ, hoặc cả ngang biên độ nhỏ hơn); ngược lại lerp offset về 0.
2. Thêm constant `HERO_BOB_AMPLITUDE`, `HERO_BOB_SPEED`.
3. Guard theo `screenShakeEnabled` từ quality controller đã có trong scene.
4. Kiểm tay: đi thấy nhịp bước nhẹ; dừng thì tĩnh; bật quality low/tắt shake thì không bob.

## Todo

- [ ] Logic bob camera theo trạng thái `moving` qua `setFollowOffset`, lerp về 0 khi dừng
- [ ] Constant biên độ/tần số; guard `screenShakeEnabled`
- [ ] Kiểm tay cảm giác + typecheck/lint/test xanh

## Success Criteria

- Hero đi → camera nhún rất nhẹ theo nhịp; dừng → tĩnh.
- Tắt shake trong quality → không bob.
- Không ảnh hưởng follow/bounds, không giật khi đổi hướng.

## Rủi ro & Rollback

- Rủi ro chính: gây say xe nếu biên độ lớn → giữ biên độ ≤ vài px, cho tắt qua quality. Rollback: xoá logic bob và reset offset.

## Lưu ý

Nếu test tay thấy bob gây khó chịu khi gõ/di chuyển nhiều, cân nhắc hạ ưu tiên phase này (P2) hoặc bỏ — xác nhận với người dùng khi review kết quả.
