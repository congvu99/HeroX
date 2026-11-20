---
phase: 1
title: "Asset Kenney + credit"
status: completed
effort: "S (0.5 ngày)"
---

# Phase 1: Asset Kenney + credit

## Context

- Kenney Tiny Town, Tiny Dungeon đã tải, xác minh License.txt CC0 ở scratchpad (`kenney-tiny-town/extracted/`, `kenney-dungeon/extracted/`).
- Credit nguồn: `assets/credits.json` → `node tools/build-credits.mjs` sinh `assets/CREDITS.md`.
- `client/test/asset-credits.test.ts` yêu cầu mọi ảnh có dòng credit.

## Requirements

- Chỉ đưa vào repo file cần: `tilemap_packed.png` của mỗi pack + `License.txt`. Không đưa Sample, file preview.
- Giữ nguyên 16px gốc trong `assets/tiles/kenney/`; scale x2 làm trong generator (một nguồn sự thật, không lưu 2 bản).

## Files

- Tạo: `assets/tiles/kenney/tiny-town.png`, `assets/tiles/kenney/tiny-dungeon.png`, `assets/tiles/kenney/LICENSE-tiny-town.txt`, `assets/tiles/kenney/LICENSE-tiny-dungeon.txt`
- Sửa: `assets/credits.json`, `assets/CREDITS.md` (sinh)

## Steps

1. Copy 2 tilesheet + license từ scratchpad (kiểm lại kích thước: 12 cột x 16px, không spacing).
2. Thêm 2 entry vào `credits.json` theo đúng schema hiện có (path, title, source, url kenney.nl, authors "Kenney", license CC0).
3. Chạy `node tools/build-credits.mjs`.
4. Chạy `npx vitest run client/test/asset-credits.test.ts`.

## Validation

- Test credit xanh; `CREDITS.md` có 2 dòng Kenney.

## Rollback

- Xóa `assets/tiles/kenney/`, revert `credits.json`, sinh lại `CREDITS.md`.
