# Phase 2 — Loader sprite trận riêng và khai báo job (0 lượt)
Trạng thái: done

## Files
- `client/src/render/battle-actors.ts`: `MONSTER_SPRITES` giữ nguyên cho bản đồ. Thêm khoá texture trận `monster-battle:<file>`, tải từ `sprites/monsters/battle/<file>.png` nếu có (`spriteAssetUrl` trả `undefined` khi thiếu). `showEnemy` ưu tiên bản trận ở scale 1; thiếu thì lùi về bản 64 với `ACTOR_SCALE`/`BOSS_SCALE` như cũ.
- `tools/pixellab/job-factory.mjs`: thêm `battleMonster(id, file, prompt, { seed, boss })` → path `sprites/monsters/battle/<file>.png`, size 128 (trùm 192), frameSize bằng size, prompt giữ `color-neutral palette` + `BASE_STYLE`. Lấy prompt từ job `monster()` tương ứng, không chép tay chuỗi.
- `tools/pixellab/jobs.mjs`, `tools/pixellab/jobs-chapters-2-5.mjs`: thêm 17 job quái trận và 5 nền bằng `battleBackdrop()` (`battle-fields`, `battle-village`, `battle-lair`, `battle-ash-forest`, `battle-catacomb`).
- Không đổi `client/src/world/roaming-monsters.ts`, `client/src/render/prop-sprites.ts`.

## Kiểm
- `node tools/pixellab/generate.mjs --dry` liệt kê đủ 17 + 5 job mới.
- vitest (gồm `asset-credits.test.ts`), tsc. Khi chưa có file mới, trận và bản đồ hoạt động y như cũ.
