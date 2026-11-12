---
phase: 2
title: "Cầu dữ liệu: xác thực, đọc tiến độ, schema herox"
status: pending
priority: P1
effort: "3d"
dependencies: [1]
---

# Phase 02: Cầu dữ liệu

## Goal
Server HeroX xác thực bằng phiên `eng`, tính chỉ số học từ `progress` + `words`, lưu trạng thái game ở schema `herox`, không bao giờ ghi `public.*`.

## Bằng chứng từ `eng`
- Token: `Authorization: Bearer <token>`, regex `^[A-Za-z0-9_-]{20,200}$`, băm `sha256(token)` hex, tra `sessions.token_hash` với `last_used_at > now() - interval '180 days'` (`eng/server/auth-and-sync-routes.js:38-48`, `password-hashing-and-session-tokens.js`).
- HeroX **không** cập nhật `last_used_at` (role chỉ SELECT). Hệ quả: chơi HeroX không gia hạn phiên `eng`; chấp nhận vì người dùng vẫn mở `eng` để học.
- Payload `progress.data`: `{ v, srsEpoch, srs:{[wordId]:{state, ivl, due, reps, lapses, last, mt?}} ... }` (`eng/js/sync-merge.js:1-10`).
- Đã học: từ có trong `words` và `state !== 'new'`; đã thuộc: `ivl >= 21` (`eng/js/srs-scheduler.js:155-165`). Record có `max(last, mt) < srsEpoch` bỏ qua.

## Files to Create
- `server/src/db/pool.ts` — pool `pg`, `max: 5`, bắt sự kiện `error` (không làm chết process), thử lại kết nối có backoff.
- `server/src/db/migrations/001-herox-schema.sql` — `CREATE SCHEMA IF NOT EXISTS herox`; bảng:
  - `herox.heroes (user_id int PK, name text, gender text, level_seen int, gold int, crystals int, outfit text, created_at, updated_at, row_version int)`
  - `herox.citadel_buildings (user_id, building text, level int, PK(user_id, building))`
  - `herox.inventory (user_id, item_id text, level int, equipped bool, PK(user_id, item_id))`
  - `herox.skill_loadout (user_id, slot int, word_id text, PK(user_id, slot))` — vòng từ 6 ô
  - `herox.story_progress (user_id, chapter int, beat text, completed_at, PK(user_id, chapter, beat))`
  - `herox.word_misses (user_id, word_id text, misses int, last_miss_at, PK(user_id, word_id))`
  - `herox.battle_rewards (user_id, battle_id text, claimed_at, PK(user_id, battle_id))` — chống nhận thưởng 2 lần
  - Không FK sang `public.users` để không cần quyền REFERENCES; dọn user đã xoá bằng job định kỳ đọc `public.users`.
- `server/src/db/migrate.ts` — chạy migration idempotent lúc khởi động, bảng `herox.schema_migrations`.
- `server/src/auth/eng-session.ts` — `authenticate(req) → userId | 401`. Copy đúng thuật toán băm (không import từ `eng`), kèm comment trỏ nguồn.
- `server/src/learning/learning-stats.ts` — thuần: `(progressData, deckWords, now) → { learned, mastered, byPos:{verb, noun, adj, adv, prep, other}, streakDays, retention30, weakWords[] }`.
- `server/src/learning/learning-repository.ts` — `SELECT data FROM public.progress WHERE user_id=$1`, `SELECT id, word, pos, meaning, emoji, ipa FROM public.words` (cache bộ từ trong RAM, làm mới theo `deck_meta.content_hash`).
- `server/src/routes/me-routes.ts` — `GET /herox/api/me` (profile + learning stats + hero state), `PUT /herox/api/hero` (tên, giới tính lần đầu).
- `server/test/fixtures/progress-*.json` — payload mẫu tổng hợp (không phải dữ liệu thật): rỗng, có epoch, có từ không còn trong bộ, đủ 4 state.
- `server/test/learning-stats.test.ts`, `eng-session.test.ts`, `contract-eng-payload.test.ts`.
- SQL cho người dùng tự chạy (không chạy từ agent): `D:\DB-Backup\HeroX\2026\<yyyyMMdd>\herox.role_herox_app_<HHmmss>_after.sql` + `_before.sql` ghi "không có bản cũ" (object mới). Nội dung: tạo role `herox_app` LOGIN, `GRANT SELECT ON public.users, public.sessions, public.progress, public.words, public.deck_meta`, `GRANT CREATE ON DATABASE` chỉ để tạo schema `herox` hoặc DBA tạo sẵn schema rồi `GRANT ALL ON SCHEMA herox`. Rollback: `DROP OWNED BY herox_app; DROP ROLE herox_app;`.

## Tasks
1. Viết `learning-stats` thuần trước, test theo fixture (TDD).
2. Test hợp đồng: dựng fixture bằng chính `mergeSync`/`sanitizePayload` của `eng` khi repo `eng` có mặt cạnh (`../eng/js/sync-merge.js`), bỏ qua test nếu không có. Cảnh báo khi `eng` đổi dạng payload.
3. `pos` trong `words` là chuỗi tự do: viết bảng chuẩn hoá (`v`, `verb` → verb; `n` → noun; `adj`; `adv`; `prep`; còn lại → other). Đo phân bố `pos` thật bằng một câu `SELECT pos, count(*) FROM public.words GROUP BY pos` — người dùng tự chạy, trả kết quả.
4. Rate limit API theo IP và user (như `eng`), body tối đa 16 KB, chỉ nhận `application/json`.
5. Không log token, username, nội dung tiến độ; log chỉ userId + mã lỗi.
6. Mọi lệnh ghi đều ở `herox.*`; thêm test quét SQL trong `server/src` không có `INSERT|UPDATE|DELETE` nhắm `public.`.

## Verification
- `npm test -w server` pass; test hợp đồng chạy với repo `eng` cạnh.
- Chạy local với Postgres Docker tạm (DB rỗng, seed fixture), `curl -H "Authorization: Bearer <token test>" localhost:3180/herox/api/me` trả learned/mastered đúng fixture.

## Risks
- `eng` đổi payload hoặc cách băm → test hợp đồng báo; HeroX trả 503 có thông báo thân thiện thay vì số sai.
