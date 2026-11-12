-- Trận đang chơi: lưu setup (seed, bộ từ, quái) server cấp lúc bắt đầu để chạy lại log input khi nhận kết quả.
-- Không dùng log của client làm nguồn sự thật; thưởng chỉ ghi sau khi server chạy lại trận khớp.
-- Mỗi người chơi chỉ giữ một trận mở: bắt đầu trận mới xoá trận trước (server/src/battle/battle-repository.ts).
CREATE TABLE IF NOT EXISTS herox.battles (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  battle_id text NOT NULL,
  encounter_id text NOT NULL,
  setup jsonb NOT NULL,
  started_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, battle_id)
);
