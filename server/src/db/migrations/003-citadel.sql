-- Thành trì Lexhold: bậc chiêu nâng ở tháp phép và ngày nhận pha lê gần nhất.
-- Cấp lò rèn dùng herox.citadel_buildings, trang bị dùng herox.inventory, vòng từ dùng herox.skill_loadout (001).

-- Ngày theo giờ người chơi; chỉ nhận khi ngày mới lớn hơn ngày đã lưu (xem shared/src/progression/citadel-rules.ts).
ALTER TABLE herox.heroes ADD COLUMN IF NOT EXISTS last_crystal_claim_day date;

CREATE TABLE IF NOT EXISTS herox.skill_tiers (
  user_id int NOT NULL REFERENCES herox.heroes (user_id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (skill IN ('attack', 'guard', 'empower', 'evade')),
  tier int NOT NULL CHECK (tier BETWEEN 1 AND 3),
  PRIMARY KEY (user_id, skill)
);
