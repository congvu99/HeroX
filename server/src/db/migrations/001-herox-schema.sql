-- Trạng thái game HeroX, tách hẳn khỏi dữ liệu LingoBrain ở schema public.
-- Schema herox và bảng herox.schema_migrations do migrate.ts tạo trước khi chạy file này.
-- Không có FK sang public.users để role herox_app không cần quyền REFERENCES trên bảng của LingoBrain;
-- user đã xoá được dọn định kỳ (server/src/db/deleted-user-cleanup.ts).

CREATE TABLE IF NOT EXISTS herox.heroes (
  user_id int PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  level_seen int NOT NULL DEFAULT 0 CHECK (level_seen >= 0),
  gold int NOT NULL DEFAULT 0 CHECK (gold >= 0),
  crystals int NOT NULL DEFAULT 0 CHECK (crystals >= 0),
  outfit text NOT NULL DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  row_version int NOT NULL DEFAULT 1
);

-- Dữ liệu con gắn với nhân vật: xoá nhân vật thì xoá theo.
CREATE TABLE IF NOT EXISTS herox.citadel_buildings (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  building text NOT NULL,
  level int NOT NULL DEFAULT 1 CHECK (level >= 0),
  PRIMARY KEY (user_id, building)
);

CREATE TABLE IF NOT EXISTS herox.inventory (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  item_id text NOT NULL,
  level int NOT NULL DEFAULT 1 CHECK (level >= 0),
  equipped boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, item_id)
);

-- Vòng từ có 6 ô, đánh số 0..5.
CREATE TABLE IF NOT EXISTS herox.skill_loadout (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  slot int NOT NULL CHECK (slot BETWEEN 0 AND 5),
  word_id text NOT NULL,
  PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS herox.story_progress (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  chapter int NOT NULL CHECK (chapter >= 1),
  beat text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter, beat)
);

-- Từ gõ sai trong trận; không ghi ngược vào SRS của LingoBrain.
CREATE TABLE IF NOT EXISTS herox.word_misses (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  word_id text NOT NULL,
  misses int NOT NULL DEFAULT 0 CHECK (misses >= 0),
  last_miss_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, word_id)
);

-- Khoá chính chặn nhận thưởng một trận hai lần.
CREATE TABLE IF NOT EXISTS herox.battle_rewards (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  battle_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, battle_id)
);
