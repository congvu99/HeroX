-- Trận người chơi đã thắng ít nhất một lần: bằng chứng để server ghi mốc truyện loại "thắng trận".
-- herox.battles chỉ giữ trận mở gần nhất nên không dùng được làm lịch sử.
CREATE TABLE IF NOT EXISTS herox.encounter_victories (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  encounter_id text NOT NULL,
  first_won_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, encounter_id)
);
