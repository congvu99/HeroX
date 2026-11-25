# Phase 3 — Sinh thử 2 ảnh (2 lượt)
Trạng thái: done

## Nạp key mới (PowerShell, trước mỗi lệnh sinh ảnh)
```powershell
$env:PIXELLAB_API_KEY = [Environment]::GetEnvironmentVariable('PIXELLAB_API_KEY','User')
node tools/pixellab/generate.mjs <jobId...> --max-generations=N
```
Dòng "Lượt sinh còn lại (gói)" đầu log phải là 40 trước đợt đầu. Ra 1 tức đang dùng key cũ: dừng.

## Việc
1. Sinh `ash-wolf` (128) và `scarecrow-demon` (192, trận lair dễ chụp).
2. Khởi động lại dev server, chụp hai trận có hai quái này cạnh hero.
3. Đạt (mật độ pixel khớp hero, màu trung tính nhuộm được) thì sang phase 4. Không đạt thì chỉnh prompt hoặc size, tối đa 2 lượt nữa (trừ vào dự phòng).
