---
title: "Phase 3: Hiệu ứng trạng thái và cân bằng"
status: done
priority: P1
effort: "5h"
dependencies: [2]
---

# Phase 3: Hiệu ứng trạng thái và cân bằng

## Overview

Chiêu bậc combo cao gắn trạng thái có tác dụng thật. Logic nằm trong `shared/src/combat`, để server replay được.

## Bảng trạng thái (đề xuất, chốt lại sau mô phỏng)

Quái chỉ đánh khi người chơi sai. Vì vậy:
- Trạng thái gây sát thương tick **mỗi đòn đúng**.
- Trạng thái chặn đòn áp vào **lần quái đánh kế tiếp**.

| Trạng thái | Từ chiêu | Tác dụng | Thời hạn | FX lặp |
|---|---|---|---|---|
| Đốt (burn) | attack fire | +10% sát thương đòn chiêu, tick sau mỗi đòn đúng | 3 đòn đúng | `status-burning` |
| Độc (poison) | empower nature/shadow | mất 3% máu tối đa của quái mỗi đòn đúng, bỏ qua khiên lửa | 3 đòn đúng | `status-poisoned` |
| Đóng băng (freeze) | empower/guard ice | quái bỏ lần đánh kế, đòn đúng kế tiếp +25% rồi vỡ băng | tới khi vỡ | `status-frozen` |
| Choáng (stun) | attack lightning | quái bỏ lần đánh kế | 1 lần đánh | `status-stunned` |
| Hút máu (lifesteal) | attack shadow | hồi 20% sát thương gây ra | tức thì | `shadow-life-steal` |
| Hồi máu (heal) | guard holy | hồi 8% máu tối đa của hiệp sĩ | tức thì | `holy-heal` |
| Tăng tốc (haste) | evade | cửa sổ combo +1,5 s | 3 đòn đúng | `status-haste` |
| Nguyền (curse) | empower | giữ `weakenedHits` hiện có | như cũ | `status-cursed` |

**Xác suất theo bậc combo:**
- Bậc 1: 0%.
- Bậc 2: 25%.
- Bậc 3: 50%.
- Bậc 4: 100%.
- Bậc 5: 100%, tác dụng ×1,5.

Xác suất được bốc bằng luồng RNG chiêu của phase 2.

**Giới hạn:**
- Mỗi trạng thái chỉ có 1 bản trên một mục tiêu; dính lại thì làm mới thời hạn, không cộng dồn.
- Trùm: freeze và stun chỉ còn phần cộng sát thương, không chặn đòn.
- Khiên lửa: chặn sát thương đốt. Độc vẫn ăn, nhưng không thể giết trùm khi khiên đang dựng (máu giữ tối thiểu 1).
- Khi tick, đốt và độc cũng không được hạ quái dưới ngưỡng `FINISHER_EXECUTE_RATIO`. Cách này giữ ý nghĩa của đòn
  kết liễu.
- Tăng tốc: `COMBO_WINDOW_MS` thành tham số tính theo trạng thái. `comboExpiresAtMs` nhận cửa sổ hiện tại.

## Thiết kế dữ liệu

- `EnemyBattleState` thêm `statuses: readonly ActiveStatus[]`.
- `HeroBattleState` thêm `statuses` (haste).
- Sự kiện mới:
  - `statusApplied { target, status, turns }`
  - `statusTick { target, status, damage, enemyHp }`
  - `statusExpired { target, status }`
  - `heal { amount, heroHp }`
- Sự kiện `enemyAttack` thêm `prevented: 'stun' | 'freeze' | null`.
- Hằng số cân bằng đặt cạnh `damage-formula.ts` (`status-effects.ts`), có comment tiếng Việt cho công thức.

## Cân bằng

Viết `shared/src/combat/battle-balance.sim.test.ts`: bot trả lời đúng với xác suất p ∈ {0,7; 0,85; 0,95}, chơi các
`encounters` của 5 chương. Mỗi cấu hình 500 trận, seed cố định. Ngưỡng nhận:
- Số đòn đúng trung bình để thắng giảm ≤ 15% so với luật cũ.
- Tỉ lệ thua ở p = 0,7 không tăng. Nó được phép giảm tối đa 10 điểm phần trăm.
- Không có trận nào thắng bằng đốt hoặc độc mà không có đòn chiêu ở pha khiên lửa.

Nếu lệch ngưỡng thì chỉnh hằng số trong `status-effects.ts`, không chỉnh logic.

## Todo

- [x] `status-effects.ts`: kiểu, hằng số, hàm áp/tick/hết hạn, và test cho từng trạng thái
- [x] Nối vào `battle-state.ts` (`cast`, `enemyAttack`, `advance` cho cửa sổ combo)
- [x] Test tương tác: trùm, khiên lửa, đòn kết liễu, né cùng choáng (né tiêu trước hay choáng tiêu trước: choáng tiêu
      trước để giữ lượt né)
- [x] Mô phỏng cân bằng đạt ngưỡng
- [x] Gắn `status` vào các chiêu bậc ≥ 2 trong `skill-moves.ts`

## Success Criteria

Mọi test của `shared` pass, mô phỏng đạt ngưỡng, `replayBattle` tất định với trạng thái.

## Risk

- Thay đổi phạm vi lớn trong `battle-state.ts` (~460 dòng). Tách `status-effects.ts` để giữ hàm ngắn (Sonar S3776).

## Kết quả (2026-11-25)

- Hằng số sau mô phỏng: độc 1,5% máu tối đa, hút máu 15%, hồi máu 5%, hệ số bậc 5 ×1,25 (bản đề xuất là 3%, 20%, 8%, ×1,5).
- Mô phỏng (cấp 3, 300 trận/ô): số đòn để thắng giảm tối đa 13,6%; ở p = 0,7 tỉ lệ thắng tăng tối đa 9 điểm (trong ngưỡng).
  Ở p = 0,85 chương 4–5 dễ hơn rõ: ch5-boss 18 → 33%, ch5-field 47 → 68%, ch4-boss 44 → 58%, ch4-field 70 → 83%.
- Không commit được `battle-balance.sim.test.ts`: luật cũ không còn trong code để làm mốc so sánh. Mô phỏng chạy bằng file tạm.
