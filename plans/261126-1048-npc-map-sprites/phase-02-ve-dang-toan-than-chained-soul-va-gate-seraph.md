---
title: "Phase 2: Vẽ dáng toàn thân chained-soul và gate-seraph"
status: done
priority: P2
effort: "1h"
dependencies: [1]
---

# Phase 2: Vẽ dáng toàn thân chained-soul và gate-seraph

## Overview

Dùng 2 lượt PixelLab cuối, mỗi NPC 1 lượt, sinh ảnh toàn thân 64 px cho bản đồ. Ảnh bán thân hiện có giữ làm chân
dung hộp thoại (`dialog-runner.ts` không đổi). Không có lượt thử lại.

## Bối cảnh (đã đọc)

- `portrait()` (`tools/pixellab/job-factory.mjs:56`) sinh `portrait bust of ...` 64×64, ghi `sprites/npc/<speaker>.png`.
- `monster()` cùng file là mẫu ảnh toàn thân 64 px, khung chân chạm đáy (`frameSprite` trong `generate.mjs:77`).
- `generate.mjs` nhận `[jobId ...]`, `--dry`, `--max-generations=N`; tự ghi `assets/credits.json` và
  `art-recipes.json` khi sinh xong (`upsertCredits`).
- Lỗi pixflux đã gặp: tượng trên bệ, bóng đen không chi tiết, hình người không áo. Bảng `BATTLE_OVERRIDES`
  (`jobs-chapters-2-5.mjs`) có sẵn tiền tố prompt né lỗi, dùng lại câu chữ đó.
- Key: `[Environment]::GetEnvironmentVariable('PIXELLAB_API_KEY','User')`, shell phiên có thể còn key cũ.

## Files

- Modify: `tools/pixellab/job-factory.mjs`: thêm `npcFigure(speaker, prompt, seed)`, ghi
  `sprites/npc/<speaker>-figure.png`, 64×64, khung chân chạm đáy, cùng `BASE_STYLE` và `STYLE_REF`.
- Modify: `tools/pixellab/jobs-chapters-2-5.mjs`: 2 job mới, đưa vào `CHAPTER_2_5_JOBS`.
- Modify: `client/src/render/npc-sprite-paths.ts`: `chained-soul`, `gate-seraph` trỏ sang `-figure.png`.
- Create (sinh ra): `assets/sprites/npc/chained-soul-figure.png`, `assets/sprites/npc/gate-seraph-figure.png`.
- Modify (tự sinh): `assets/credits.json`, `tools/pixellab/art-recipes.json`, `assets/CREDITS.md` (qua `tools/build-credits.mjs` nếu repo đang làm vậy).

## Prompt đề xuất

Tiền tố chung: `full body standing figure, legs visible, fully clothed, fully shaded, not a silhouette, no pedestal`.

- `chained-soul`: `gaunt tormented man in tattered grey robes, wrapped in heavy iron chains, faint pale glow`, seed 42011.
- `gate-seraph`: `radiant guardian seraph in ivory plate armor and long white robes, folded feathered wings, holding gleaming gate keys`, seed 52011.

Seed mới (khác seed bán thân 42001/52001) để không ra lại dáng bán thân.

## Implementation Steps

1. Viết `npcFigure()` và 2 job. Chạy `node tools/pixellab/generate.mjs --dry chained-soul-figure gate-seraph-figure`:
   đúng 2 job, đúng đường dẫn, không job nào khác.
2. Đọc `/v2/balance`, phải còn 2. Khác 2 thì dừng, báo người dùng.
3. Sinh từng job một: `--max-generations=1 chained-soul-figure`. Xem ảnh phóng ×4 trên nền tối và nền cỏ.
4. Tiêu chí nhận ảnh: toàn thân có chân, mặc áo, không bệ, không bóng đen, đọc được ở 64 px cạnh hero. Đưa ảnh cho
   người dùng duyệt trước khi trỏ bảng sang ảnh mới.
5. Lặp bước 3–4 cho `gate-seraph-figure`.
6. Ảnh được duyệt: đổi khoá trong `npc-sprite-paths.ts`. Ảnh bị từ chối: xoá file sinh ra và bản ghi credit của nó,
   giữ khoá trỏ ảnh bán thân, ghi lý do vào plan.md.
7. Đọc lại `/v2/balance`, ghi số còn lại vào plan.md.

## Failure Protocol

- API lỗi giữa chừng: không chạy lại khi chưa đọc balance; lượt đã trừ mà không có ảnh thì báo người dùng.
- Không dùng animate PixelLab (memory dự án: giật khung).

## Todo

- [x] `npcFigure()` + 2 job, `--dry` đúng 2 job
- [x] chained-soul-figure sinh, người dùng duyệt
- [x] gate-seraph-figure sinh, người dùng duyệt
- [x] Bảng hình trỏ ảnh mới (hoặc ghi lý do giữ ảnh cũ)
- [x] Balance sau khi chạy ghi vào plan.md

## Success Criteria

- Test phase 1 vẫn pass (file mới tồn tại); `client/test/asset-credits.test.ts` pass.
- `dialog-runner.ts` không đổi: hộp thoại vẫn hiện chân dung bán thân.

## Rollback

Trỏ khoá về ảnh bán thân, xoá 2 file `-figure.png` và bản ghi credit tương ứng. Lượt đã tiêu không lấy lại được.
