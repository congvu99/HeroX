# Phase 4 — Sinh theo đợt (20 lượt + 9 dự phòng)
Trạng thái: done

Mỗi đợt: nạp key (phase 3), chạy với `--max-generations` bằng số job của đợt, xem từng ảnh, sinh lại ảnh xấu bằng `--force <id>` (trừ dự phòng), ghi lượt còn lại vào plan.

| Đợt | Job | Lượt |
|---|---|---|
| A | 5 nền: fields, village, lair, ash-forest, catacomb | 5 |
| B | 4 trùm 192: ash-stag, nameless-bishop, antonym-demon, fallen-angel | 4 |
| C | 11 quái 128: imp, skeleton, ghoul, elite-demon, ash-sprite, red-cleric, bone-knight, fire-imp, lava-hound, mute-cherub, broken-seraph | 11 |

Sau mỗi đợt chạy `node tools/build-credits.mjs`. Dừng hẳn nếu lượt còn lại ít hơn số job đợt kế + 2.
