-- Bản sao tối giản các bảng LingoBrain mà HeroX đọc, lấy từ eng/server/schema.sql.
-- Chỉ dùng trong test với Postgres nhúng; không bao giờ chạy lên DB thật.
CREATE TABLE IF NOT EXISTS public.users (
  id serial PRIMARY KEY, username text UNIQUE NOT NULL, pass_hash text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.sessions (
  token_hash text PRIMARY KEY, user_id int NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(), last_used_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.progress (
  user_id int PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, data jsonb NOT NULL, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.words (
  id text PRIMARY KEY, word text NOT NULL, ipa text NOT NULL DEFAULT '', pos text NOT NULL DEFAULT '',
  meaning text NOT NULL DEFAULT '', context text NOT NULL DEFAULT '', context_vi text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '', emoji text NOT NULL DEFAULT '', image text NOT NULL DEFAULT '',
  mnemonic text NOT NULL DEFAULT '', output_prompt text NOT NULL DEFAULT '',
  sort_order int NOT NULL, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.deck_meta (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), deck text NOT NULL, updated text NOT NULL DEFAULT '',
  voice text NOT NULL DEFAULT '', content_hash text NOT NULL, seeded_at timestamptz DEFAULT now());
