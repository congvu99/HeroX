# Phase 2 — Sinh asset (tốn lượt, cần user đồng ý trước khi chạy)
Trạng thái: pending

## Bước
1. Ghi lượt trước: `/v2/balance`.
2. Backup sheet cũ: copy `assets/sprites/hero/hero_{idle,slash,spellcast,hurt}.png` sang scratchpad (git cũng giữ bản cũ).
3. Chạy `node tools/pixellab/generate.mjs hero-battle --force`; xem 4 sheet. Xấu → đổi seed/prompt, chạy lại 1 động tác (≤ 3 lượt dự phòng tổng).
4. Chạy `node tools/pixellab/generate.mjs battle-backdrop`; xem ảnh.
5. `node tools/build-credits.mjs`; ghi lượt sau.

## Kiểm
- Ảnh đúng kích thước (sheet: cao 192, rộng columns*192; nền 192x352).
- Lượt dùng ≤ 9; nếu exit 3 thì dừng, báo job còn thiếu.
