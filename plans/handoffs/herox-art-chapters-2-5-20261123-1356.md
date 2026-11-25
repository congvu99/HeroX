# Handoff — HeroX: asset PixelLab + chương 2–5 + dọn phase 7–9 (atoz)

## Mission and current status

Tiếp tục chạy skill `/g1:atoz` (gate 3) theo hợp đồng
`plans/261120-1806-herox-pixellab-art-chapters-2-5/atoz-contract.md`. Mục tiêu: đưa HeroX
lên 5 chương chơi trọn với asset PixelLab chính thức, dọn việc dang dở phase 7–9, kết thúc
bằng PR về master trên GitHub (KHÔNG merge). KHÔNG dùng model fable.

Đã xong:
- Chương 2–5 (data/enemies/word-chains/map LDtk/theme/encounter/đăng ký STORY_CHAPTERS) + trận
  cuối chương 5 `masteredOnly` (chỉ rút từ đã thuộc). 630 test pass.
- Asset PixelLab: 16 sprite mới (12 quái/trùm chương 2–5 + 4 NPC thoại) + imp chương 1 trước đó.
  Recipe + credit đầy đủ, `build-credits` sạch. Quota generations CÒN (không hit exhaust).
- Hero: GIỮ sheet LPC (quyết định user — PixelLab animation hướng lưng/trái không đạt).

Còn lại (phiên mới làm): D1 (viết lại art-direction.md), D2 (8 lỗi review phase 7–9 + sw.js),
V (verify toàn bộ + code-review cô lập + sửa), S (mở PR về master).

## Scope and guardrails

- Workspace: `D:\project\HeroX` (monorepo npm: shared/server/client). Nhánh tích hợp
  `feature/herox-pixellab-art-chapters-2-5` từ origin/master.
- ĐƯỢC: gh CLI mở PR GitHub (user duyệt); đọc `PIXELLAB_API_KEY` từ env để gọi api.pixellab.ai.
- CẤM: merge PR; push/sửa nhánh master/release; chạm repo eng; ghi giá trị API key ra file/log/commit/báo cáo;
  AI-attribution trong git (commit/PR/branch); sửa tay file `.ldtkl` (script sinh tất định).
- DB: chỉ SELECT trên public.*; ghi schema herox. Script đổi dữ liệu phải backup trước, user tự chạy.
- KHÔNG commit plan dir `plans/261120-1806-.../` và `plans/reports/Explore-261120-1826-...md`
  (giữ untracked theo contract).
- Hết quota PixelLab: KHÔNG dừng, dùng tạm asset đã có, user bổ sung sau.

## Current state

- Branch: `feature/herox-pixellab-art-chapters-2-5`
- HEAD: `cb91245` (feat(battle): trận masteredOnly...)
- Working tree SẠCH trừ 2 mục untracked cố ý giữ: plan dir + Explore report (xem guardrails).
- Commit chuỗi phiên này: `cb91245` (masteredOnly server) → `2f24283` (asset PixelLab ch2–5) →
  `f5608f9` (chương 2–5 content) → `c1eb5ce` (tool PixelLab + chapter map resolver).

Đường dẫn then chốt:
- Hợp đồng/plan: `plans/261120-1806-herox-pixellab-art-chapters-2-5/{atoz-contract.md,plan.md}`
- Pipeline map: `plans/reports/Explore-261120-1826-art-and-chapters-pipeline.md`
- Review 8 lỗi: `plans/reports/code-reviewer-261112-1730-chapter-1-review.md` (mục D2 trong plan.md trích đủ)
- Tool asset: `tools/pixellab/{generate,jobs,jobs-chapters-2-5,job-factory,api-client}.mjs`,
  recipe `tools/pixellab/art-recipes.json`

## Decisions and rationale

- Hero GIỮ LPC: PixelLab rotate hướng lên/trái mất silhouette (khối áo choàng), animate-with-text giật.
  Thay sẽ regress chất lượng. (Phát hiện gate 3, ghi trong contract.)
- Quái/trùm/NPC = PNG đơn PixelLab, màu trung tính (runtime MULTIPLY tint). Trùm dùng cùng PNG làm chân dung thoại.
- Map chương 2–5 dùng tile Kenney (đã sinh ở C), KHÔNG cần PixelLab tile → A2 chỉ sinh sprite nhân vật.
- `job-factory.mjs` tách khỏi `jobs.mjs` để gỡ vòng import (jobs.mjs ↔ jobs-chapters-2-5.mjs).
- Trận cuối ch5 `masteredOnly`: cơ chế engine (Encounter.masteredOnly + lọc ở battle-preparation),
  không gắn được vào dữ liệu trận thuần.

## Work performed

- Thêm `tools/pixellab/jobs-chapters-2-5.mjs` (12 monster + 4 portrait job) và `job-factory.mjs`.
- Chạy `node tools/pixellab/generate.mjs`: sinh 16 file (16 generations), bỏ qua 8 job đã có.
- `node tools/build-credits.mjs`: sạch. `npx vitest run`: 58 file / 630 test pass.
- Commit 4 checkpoint (xem Current state). Cập nhật plan.md task list (A2 = done).

## Verification

- `npx vitest run` → 58 file / 630 test pass (đã xác minh sau asset + masteredOnly).
- `node tools/build-credits.mjs` → ghi CREDITS.md sạch.
- CHƯA chạy ở phiên này: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`
  (để dành cho bước V). CHƯA kiểm asset mới bằng mắt trong game thật.
- Flaky đã biết: `server/src/app.test.ts` health check đôi khi timeout 5s khi chạy full (cold start ~5.6s),
  pass khi chạy riêng — không phải regression.

## Open risks and blockers

- **Lỗi review #3 (forge-lock) VẪN MỞ**: khoá lò rèn áp lên người chơi cũ đã nâng. User được hỏi
  đã yêu cầu "hand off + phiên mới" thay vì chọn phương án. Phiên mới PHẢI hỏi lại #3 (chỉ khoá khi
  `forge_level=0` vs backfill mốc `smith-rescued`) trước khi làm D2. Phương án backfill cần script
  đổi dữ liệu schema herox (backup trước, user tự chạy).
- gh CLI KHÔNG tìm thấy trên PATH lúc kiểm trước. Bước S: thử gh, nếu thiếu → dùng REST với
  GH_TOKEN/GITHUB_TOKEN env, nếu cũng không có → dừng ở push nhánh, báo user tự mở PR.
- 8 lỗi review từ 2026-11-12 (pre-commit): số dòng trong report đã lệch so với code hiện tại
  (code đã đổi). Phiên mới phải xác minh lại từng lỗi còn tồn tại trước khi sửa, không vá theo số dòng cũ.

## Exact next actions

**First safe step**: Đọc `plans/261120-1806-herox-pixellab-art-chapters-2-5/plan.md` (task list) +
`atoz-contract.md`, rồi `git status` xác nhận HEAD = cb91245 và working tree sạch (trừ 2 untracked cố ý).

1. Hỏi user chốt phương án lỗi review #3 (forge-lock) — blocker cho D2.
2. D2: xác minh lại 8 lỗi review còn tồn tại trong code hiện tại (số dòng đã lệch), sửa từng lỗi;
   sửa sw.js (dọn cache xoá map; tăng SW_VERSION khi đổi cache). Chạm file registry chung
   (battle-actors.ts BOSS_KINDS, story-types.ts) → sửa tuần tự, chạy test sau mỗi cụm.
3. D1: viết lại `docs/art-direction.md` — PixelLab là nguồn chính, hero ngoại lệ LPC, ghi pipeline sinh/khớp.
4. V: `npm run typecheck && npm run lint && npm test && npm run build`, rồi `npm run test:e2e`;
   gọi g1:code-reviewer cô lập (model Opus/Sonnet, KHÔNG fable); sửa tới sạch.
5. S: push nhánh + mở PR về master trên GitHub (gh CLI/REST). KHÔNG merge. KHÔNG AI-attribution.

## Source pointers

- `plans/261120-1806-herox-pixellab-art-chapters-2-5/atoz-contract.md` — hợp đồng, Done means, stop conditions.
- `plans/261120-1806-herox-pixellab-art-chapters-2-5/plan.md` — phases + task list + mục D2 (8 lỗi).
- `plans/reports/Explore-261120-1826-art-and-chapters-pipeline.md` — bản đồ pipeline asset/chương.
- `plans/reports/code-reviewer-261112-1730-chapter-1-review.md` — chi tiết 8 lỗi review.
- `tools/pixellab/jobs.mjs`, `jobs-chapters-2-5.mjs`, `job-factory.mjs`, `generate.mjs` — tool sinh asset.
- `client/src/render/battle-actors.ts` (MONSTER_SPRITES/BOSS_KINDS), `client/src/story/dialog-runner.ts` (SPEAKER_INFO).
- `shared/src/combat/encounters.ts` (masteredOnly), `server/src/battle/battle-preparation.ts` (lọc masteredOnly).
- origin = https://github.com/congvu99/HeroX.git (GitHub, không Bitbucket).
