---
title: "Phase 3: Hạt lửa ở đuốc Torch"
status: done
---

# Phase 3: Hạt lửa ở đuốc Torch

## Overview

Đuốc `Torch` trên map đã có quầng sáng chập chờn (`addLight(..., true)`) nhưng chưa có hạt lửa. Thêm particle lửa/tàn nhỏ bốc lên từ mỗi đuốc, trùng vị trí quầng sáng, để đuốc "cháy" thật.

## Context (đã xác minh)

- `world-scene.ts` (dòng ~287): `for (const torch of findEntities(level, 'Torch')) atmosphere.addLight({x,y}, TORCH_LIGHT_RADIUS, true)` — đã có ánh sáng flicker, chưa có hạt.
- `battle-arena.ts:137` `addEmbers`: mẫu particle lửa sẵn có (texture ember tự vẽ, emit zone, speedY lên, alpha giảm, blend ADD) — tái dùng khuôn.
- Đuốc là entity có `x/y/width/height`, tách rời tile → gắn particle từng cái dễ.

## Requirements

- [ ] Method `GoldenHourAtmosphere.addFlame(source: LightSource, options?)` hoặc helper dùng chung với ember: phát ít hạt lửa nhỏ bốc lên tại một điểm, blend ADD, tắt dần. Tái dùng texture/khuôn của `addEmbers` (gom lại một chỗ nếu tiện, tránh lặp).
- [ ] Mỗi `Torch` trên map gọi thêm `addFlame` tại tâm đuốc (cùng điểm với `addLight`).
- [ ] Tôn trọng quality: số hạt theo `particleDensity`; `disable()`/`low` thì tắt (vào `this.objects`). Khi `dynamicLightingEnabled=false` (low) đã không tạo light — thống nhất: flame cũng không tạo ở low.
- [ ] Hạt lửa nhỏ, nhẹ, không che NPC/đường đi; đặt depth hợp lý (trên nền, quanh đuốc).

## Implementation Steps

1. Gom khuôn particle lửa: tách phần tạo texture ember + emitter của `addEmbers` thành helper tái dùng được cho cả arena ember và torch flame (DRY), hoặc thêm `addFlame` cạnh `addLight`.
2. Trong `world-scene.ts`, trong vòng lặp `Torch`, gọi `addFlame` cùng toạ độ `addLight`.
3. Căn biên độ (speedY, lifespan, tần số) nhỏ để trông như ngọn đuốc, không như đống lửa.
4. Kiểm tay: đuốc trên map (vd Lexhold/làng) thấy lửa liu riu trùng quầng sáng; ở `low` không có.

## Todo

- [ ] Helper/`addFlame` cho hạt lửa điểm (tái dùng khuôn `addEmbers`)
- [ ] Gọi `addFlame` cho mỗi `Torch` trong `world-scene.ts`
- [ ] Căn thông số cho ra "ngọn đuốc"; guard theo quality
- [ ] Kiểm tay + typecheck/lint/test xanh

## Success Criteria

- Mỗi đuốc trên map có hạt lửa bốc lên trùng vị trí quầng sáng.
- Ở `low`/`disable()`: không có hạt lửa, không lỗi.
- Không lặp code lửa giữa arena ember và torch flame.

## Rủi ro & Rollback

- Rủi ro: nhiều đuốc → nhiều emitter. Giảm tần số/giới hạn hạt; `particleDensity` chặn. Rollback: gỡ `addFlame` ở call-site và method.
