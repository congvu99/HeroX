---
title: "Nối hình NPC bản đồ chương 2-5"
date: 2026-11-26
summary: "8 NPC hết hình tạm, 2 dáng toàn thân mới, PixelLab hết lượt"
---

# Nối hình NPC bản đồ chương 2-5

## What happened
- Bảng hình NPC trên map chỉ có khoá chương 1, nên 8 NPC chương 2–5 rơi về hình tạm. Đã tách bảng ra `client/src/render/npc-sprite-paths.ts`, thêm 8 khoá và test quét mọi map (đỏ đúng 8 id trước khi sửa).
- Sinh `chained-soul-figure.png`, `gate-seraph-figure.png` bằng `npcFigure()`, người dùng duyệt. PixelLab còn 0/40 lượt.
- Kiểm trong game: 8 level dùng texture thật; trùm 128 px không che cổng.

## Phát hiện
- dialogId trên map lệch id kịch bản: `chained-soul` so với `hell-soul`, `gate-seraph` so với `heaven-gate`. Hai hội thoại này chỉ mở tự động, nói chuyện với NPC thì không có gì. Lỗi có từ trước, chưa sửa.

## Next steps
- Chọn sửa id phía map hay phía kịch bản; commit thay đổi.

> Historical work record - not durable authority. Prefer docs/specs/ADRs for current decisions.
