---
title: "HeroX phase 02 data bridge"
date: 2026-11-12
summary: "Auth bằng phiên LingoBrain, chỉ số học khớp tab Tiến bộ, schema herox, API /me /hero /ready; test SQL trên PGlite"
---

# HeroX phase 02 data bridge

## What happened
- Server HeroX xác thực bằng token phiên LingoBrain (SHA-256 hex, hạn trượt 180 ngày, không gia hạn `last_used_at`).
- `server/src/learning/learning-stats.ts` tính learned / mastered / byPos / streak / retention30 / weakWords; test hợp đồng gọi thẳng `sanitizePayload`, `mergeSync`, `deckSummary`, `computeStats` của repo `eng` và khớp trên 4 fixture.
- Schema `herox` (7 bảng) chạy migration lúc khởi động, khoá advisory, retry có backoff; API 503 tới khi xong.
- Máy dev không có Docker/Postgres: dùng PGlite (in-process) cho test SQL và `@electric-sql/pglite-socket` để chạy driver `pg` thật và `curl` bản build.
- Review độc lập: pool `pg` thiếu timeout/keepalive (HIGH), `utcOffset` mặc định UTC làm streak lệch, log lỗi DB ở mức info, job dọn chỉ chạy sau 24h. Đã sửa hết, thêm `/herox/api/ready`.

## Decision
- Role `herox_app` cấp SELECT theo cột (không đọc `users.pass_hash`), sở hữu schema `herox` → không cần CREATE ON DATABASE. Script ở `D:/DB-Backup/HeroX/2026/20261112/`, chưa chạy trên DB thật.
- `CREATE SCHEMA` chỉ chạy khi schema chưa có, vì Postgres kiểm quyền trước cả `IF NOT EXISTS`.
- `utcOffset` bắt buộc ở `GET /me` (thiếu → 400) thay vì đoán UTC.

## Next steps
- Người vận hành chạy script role và `SELECT pos, count(*) FROM public.words GROUP BY pos` trên DB thật.
- Chấp nhận/không lệch `retention30` do server eng chỉ giữ 20 lượt chấm/từ.
- Phase 04 (logic chiến đấu) dùng `LearningStats` từ `shared/src/me-contract.ts`.

> Historical work record - not durable authority. Prefer docs/specs/ADRs for current decisions.
