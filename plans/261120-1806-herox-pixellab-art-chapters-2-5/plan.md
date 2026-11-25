---
title: "HeroX — asset PixelLab toàn bộ + chương 2–5 + dọn phase 7–9"
status: in-progress
priority: P1
branch: feature/herox-pixellab-art-chapters-2-5
created: 2026-11-20
source_of_truth: atoz-contract.md
pipeline_map: ../reports/Explore-261120-1826-art-and-chapters-pipeline.md
---

# Plan

Hợp đồng và Done means: xem `atoz-contract.md`. Bản đồ pipeline: xem `pipeline_map`.
Theo dõi tiến độ ở mục Task list bên dưới (plan không commit vào repo).

## Chiến lược

Ba luồng, nhưng file registry dùng chung bắt buộc serialize:

- **Luồng A — PixelLab art pipeline** (độc lập file: `tools/pixellab/*`, `assets/sprites/**`,
  `assets/tilesets/chapter-N*`, `assets/credits.json` append). Sinh asset + ghép sheet hero
  giữ đúng layout cũ. Không đổi code render.
- **Luồng B — Cơ chế nền chương** (shared code gap): chọn map theo chương thay
  `START_MAP_PATH` hardcode; tổng quát hóa test map cho N chương. PHẢI xong trước khi
  map chương 2–5 fan-out.
- **Luồng C — Nội dung chương 2–5** (data + map + theme). Mỗi chương có file riêng
  (`chapter-N.ts`, `generate-chapter-N.mjs`) nhưng chạm file registry chung → serialize.
- **Luồng D — Dọn phase 7–9** (phần agent làm được): lỗi review, cân bằng, icon/manifest,
  atlas budget, E2E.

## Phases

| # | Phase | Phụ thuộc | File chính | Song song |
|---|---|---|---|---|
| A0 | Tool sinh asset PixelLab (`tools/pixellab/generate.mjs`) + ghép sheet | — | tools/pixellab/* | với B1 |
| A1 | Sinh hero sheet (walk+idle+slash+spellcast+hurt) ghép layout cũ | A0 | assets/sprites/hero/* | — |
| A2 | Sinh quái/trùm/chân dung/tile 5 chương (hết quota thì dừng, dùng tạm) | A0 | assets/sprites/**, tilesets | với C |
| B1 | Cơ chế chọn map theo chương + tổng quát test map | — | scene-keys.ts, boot, ldtk-loader | với A0 |
| C1 | Data chương 2 (Rừng Tro) + map + theme + đăng ký | B1 | chapter-2.ts, generate-chapter-2 | serialize registry |
| C2 | Data chương 3 (Hầm Mộ Thánh) | C1 (registry) | chapter-3.ts | serialize registry |
| C3 | Data chương 4 (Vực Lửa) | C2 (registry) | chapter-4.ts | serialize registry |
| C4 | Data chương 5 (Thiên Cung Vỡ, trận cuối từ-đã-thuộc) | C3 (registry) | chapter-5.ts | serialize registry |
| D1 | Viết lại docs/art-direction.md (PixelLab nguồn chính) | A1 | docs/art-direction.md | — |
| D2 | Dọn phase 7–9 agent làm được (review bugs, icon/manifest, balance, atlas) | — | nhiều | — |
| V | typecheck/lint/test/build + E2E; code-review cô lập; sửa tới sạch | tất cả | — | — |
| S | Mở PR về master (GitHub, gh CLI / REST); không merge | V | — | — |

## Quyết định (ghi cho báo cáo)
- Hero: ghép frame PixelLab vào sheet 192px layout cũ → 0 đổi code render hero. (Lý do: loader
  tolerant, rủi ro thấp nhất, giữ animation trận.)
- Map: 1 project/chương + selector (Option A). (Lý do: test map ch1 kiểm biên/entity theo project;
  tách project giữ test rõ ràng, cổng chéo chương không cần cho mạch chơi tuần tự.)
- Quái màu trung tính (runtime tint MULTIPLY). Beat id không đổi (DB).
- Theme sân trận: chương 2 fields/mới, 3 lair/mới, 4 lair đỏ, 5 mới "thánh quang"; thêm
  ArenaThemeId + ARENA_THEMES + ARENA_LIGHTING (lightingForArena không có fallback).

## Task list (cập nhật liên tục)
- [x] A0 tool sinh asset PixelLab (single-sprite proven; hero-sheet không đạt → hero giữ LPC)
- [x] B1 cơ chế chọn map theo chương + test tổng quát (chapter-maps.ts, đã commit c1eb5ce)
- [~] A1 hero: GIỮ LPC (quyết định user — PixelLab animation không đạt)
- [x] C1–C4 chương 2–5: XONG (story/enemies/maps/generators/theming/registry; 629 test pass). Trận cuối ch5 masteredOnly đã thêm + test.
- [x] A2 asset quái/trùm/NPC chương 2–5: XONG (16 sprite PixelLab mới, recipe+credit, build-credits sạch, 630 test pass; commit 2f24283). Quota generations còn (không hit exhaust). Tile map chương 2–5 đã có sẵn từ C (Kenney), KHÔNG cần PixelLab tile.
- [x] D1 viết lại art-direction.md (PixelLab nguồn chính; hero ngoại lệ LPC) — XONG 2026-11-23
- [x] D2 dọn phase 7–9 (8 lỗi review + 2 điểm sw.js) — XONG 2026-11-23. Lỗi #3 forge-lock: user chốt "chỉ khoá khi chưa nâng"; vì BASE_FORGE_LEVEL=1 (không ai có 0) nên điều chỉnh thành "forgeLevel > BASE_FORGE_LEVEL" (đã nâng trên cấp gốc). +3 test, 633 pass.
- [ ] V verify + code-review cô lập + sửa — typecheck/lint/test/build XONG; còn E2E + code-reviewer cô lập
- [ ] S mở PR

## D2 — 8 lỗi review (nguồn: reports/code-reviewer-261112-1730-chapter-1-review.md)
1. battle-scene.ts:435 — mốc trận mất khi gửi kết quả lỗi mạng dù server đã thắng → vẫn ghi mốc khi 409.
2. boot-scene.ts:95 — 409 tạo nhân vật kẹt → tải lại /me rồi loadStory.
3. citadel-routes.ts:159 — khoá lò rèn áp lên người chơi cũ. **CẦN USER QUYẾT** (hỏi rồi).
4. battle-repository.ts:104 / battle-routes.ts — không kiểm encounterGate khi bắt đầu trận → kiểm ở route.
5. citadel-rules.ts:221 — khoá lò rèn không chặn trang bị; buildingUnlocks dùng BuildingId (đụng story-types).
6. world-story.ts:106 — openChest gọi refresh() hiện quest-tracker đè thoại → bỏ qua khi thoại mở.
7. battle-scene.ts:63 — BOSS_KINDS cứng, trùm tải 2 texture → suy từ fireShield, 1 texture (đụng battle-actors).
8. battle-scene.ts:465 — câu báo lỗi lặp nhiều nơi → tách hàm/hằng chung.
Ngoài phạm vi (phase 8, SW): sw.js:76 dọn cache xoá map; sw.js:14 đổi cache chưa tăng SW_VERSION — làm trong D2 phần PWA.
