---
title: "Sửa lệch id hội thoại NPC chương 4-5"
date: 2026-11-26
summary: "Đổi id kịch bản hell-soul, heaven-gate cho khớp dialogId trên map"
---

# Sửa lệch id hội thoại NPC chương 4-5

## What happened
Nói chuyện với NPC `chained-soul` (Hellmaw) và `gate-seraph` (Broken_Heaven) không mở hội thoại: kịch bản đặt id `hell-soul`, `heaven-gate`, nên `selectDialog` trả null. Các lời thoại sau nhiệm vụ không bao giờ hiện.

## Decision
Đổi id trong kịch bản (`shared/src/data/story/chapter-4.ts`, `chapter-5.ts`) theo đúng quy ước chương 1–3, nơi id hội thoại trùng dialogId trên map. Tiến độ lưu theo beat, không lưu id hội thoại, nên dữ liệu người chơi không bị ảnh hưởng.

## Next steps
Test mới trong `client/test/npc-sprite-paths.test.ts` chặn lỗi này khi thêm NPC mới.

> Historical work record - not durable authority. Prefer docs/specs/ADRs for current decisions.
