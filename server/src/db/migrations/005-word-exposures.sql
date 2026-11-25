-- Lịch sử gặp từ trong HeroX: sau mỗi trận đã chốt, ghi cho từng từ đã ra đề số lần gặp,
-- chuỗi trả lời đúng liên tiếp và lần gặp cuối. Dùng khi dựng trận sau để giãn từ vừa gặp
-- và gỡ nhóm "khó" khi người chơi đã trả lời đúng liên tiếp (server/src/battle/battle-preparation.ts).
-- Chỉ chứa id từ + số đếm, không có dữ liệu cá nhân.
CREATE TABLE IF NOT EXISTS herox.word_exposures (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  word_id text NOT NULL,
  seen_count int NOT NULL DEFAULT 0 CHECK (seen_count >= 0),
  correct_streak int NOT NULL DEFAULT 0 CHECK (correct_streak >= 0),
  last_seen_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, word_id)
);
