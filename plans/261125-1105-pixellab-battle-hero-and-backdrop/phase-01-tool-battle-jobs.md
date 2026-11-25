# Phase 1 — Tool: job hero chỉ trận + job nền
Trạng thái: pending

## Files
- `tools/pixellab/jobs.mjs`: thêm `HERO_BATTLE_JOB` (kind `hero-battle`, tái dùng prompt/seed/battleMoves của `HERO_JOB`, không walk) và `BATTLE_BACKDROP_JOB` (kind `single`, `noBackground: false`, 192x352, không frameSize).
- `tools/pixellab/generate.mjs`: nhánh `hero-battle` = `generateImage(direction 'north')` 1 lượt rồi lặp `buildHeroBattleMove` (truyền `{ up: base }`). Sửa `runSingleJob` cho phép giữ nguyên cỡ ảnh khi job có nền. Cập nhật `remaining` trong `main` cho kind mới.
- `tools/pixellab/api-client.mjs`: kiểm tra `generateImage` đã truyền `direction`; nếu chưa thì thêm tham số tuỳ chọn (không đổi hành vi cũ).
- `getBalance`: thêm `getSubscriptionBalance()` gọi `/v2/balance` để in số lượt còn lại (hàm mới, không sửa hàm cũ).

## Bước
1. Đọc `runSingleJob`, `generateHeroDirections`, `job-factory.mjs` trước khi sửa.
2. Thêm job + nhánh; `HERO_JOB` giữ nguyên để không phá luồng cũ. Đảm bảo `--dry` liệt kê job mới, và job id riêng để chạy bằng `node tools/pixellab/generate.mjs <id>`.
3. Thêm cờ `--max-generations N` (hoặc kiểm số lượt từ `/v2/balance` trước mỗi job) để chặn chạy quá ngân sách.

## Kiểm
- `node tools/pixellab/generate.mjs --dry` hiện 2 job mới; không gọi API.
- Test tồn tại `reference` vẫn pass.
