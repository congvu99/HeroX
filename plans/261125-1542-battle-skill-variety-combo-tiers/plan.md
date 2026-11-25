---
title: "battle-skill-variety-combo-tiers"
description: "Chiêu trận đa dạng từ ~150 hiệu ứng pixelfx fantasy, 5 bậc theo combo từ, bốc ngẫu nhiên tránh lặp, thêm hiệu ứng trạng thái có tác dụng thật"
status: completed
priority: P1
effort: "L"
tags: [battle, skills, fx, balance, shared]
created: 2026-11-25
---

# battle-skill-variety-combo-tiers

## Overview

Hiện có 4 loại chiêu theo từ loại × 3 bậc tháp phép (`shared/src/data/skill-catalog.ts`). Trận chỉ dùng 21 trên khoảng
240 hiệu ứng pixelfx đã cài, và combo chỉ phóng to hình ở 2 mốc (`client/src/battle/battle-cues.ts:61-80`).

Đích đến:
- Mỗi loại chiêu có **bộ chiêu** chia theo **5 bậc combo**: 1, 2–3, 4–5, 6–9, 10+. Bậc càng cao, chiêu càng hoành tráng.
- Mỗi lần ra đòn, chiêu được bốc ngẫu nhiên trong nhóm (loại từ + bậc combo) và không lặp chiêu vừa dùng.
- Chiêu bậc cao gây **hiệu ứng trạng thái thật**: đốt, độc, đóng băng, choáng, hút máu, hồi máu, tăng tốc.

## Quyết định đã chốt (người dùng, 2026-11-25)

1. Dùng các hiệu ứng pixelfx hợp fantasy, khoảng 150. Bỏ sci-fi, súng, vật phẩm, chuyển cảnh, thời tiết, sinh vật.
2. Thêm hiệu ứng trạng thái có tác dụng thật, nên phải cân bằng lại.
3. Combo 5 bậc: 1, 2–3, 4–5, 6–9, 10+.
4. Ngẫu nhiên tránh lặp, có seed để test.

## Ràng buộc (đã xác minh)

- Server chạy lại cả trận bằng `replayBattle` (`server/src/routes/battle-routes.ts:165`) với cùng code `shared`. Vì vậy
  mọi thứ ảnh hưởng máu, vàng hay kết quả (chọn chiêu, trạng thái) phải nằm trong `battle-state.ts` và dùng RNG có seed.
- Bốc chiêu dùng **luồng RNG riêng**, tách từ seed trận. Như vậy dãy đề (`pickPromptWord`) không đổi và các test chọn
  từ hiện có vẫn giữ nguyên.
- Quái chỉ đánh khi người chơi sai hoặc hết giờ (`battle-state.ts` `miss` → `enemyAttack`). Trạng thái cũng tính theo
  lượt đó: tác dụng theo thời gian sẽ tick mỗi đòn đúng, còn tác dụng chặn đòn áp vào lần quái đánh kế tiếp.
- Atlas FX: 21 hiệu ứng nặng 3,5 MB. Nếu nạp hết ~150 hiệu ứng sẽ tới ~25 MB, không chấp nhận được trên mobile. Mỗi trận
  chỉ nạp **bộ chiêu của trận**, dùng `queueFxAssets(scene, onlyNames)` (`client/src/fx/fx-player.ts:40`).
- Thứ tự giữ nguyên: bậc tháp phép vẫn tăng sức mạnh 15% mỗi bậc. Đòn kết liễu chuỗi cụm, khiên lửa của trùm và hệ số
  combo hiện có cũng giữ nguyên.

## Non-goals

- Không có bảng chọn chiêu thủ công và không thêm nút bấm. Chiêu vẫn do từ loại quyết định.
- Không dùng hiệu ứng sci-fi, súng, chuyển cảnh, thời tiết, sinh vật, vật phẩm.
- Không sinh ảnh PixelLab: chỉ còn 2/40 lượt, và mọi hiệu ứng đều lấy từ pixelfx.
- Không đổi màn thành trì, ngoài tên chiêu hiển thị nếu cần.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Danh mục FX fantasy và atlas](./phase-01-danh-muc-fx-fantasy.md) | Done |
| 2 | [Phase 2: Bộ chiêu 5 bậc combo và bốc ngẫu nhiên](./phase-02-bo-chieu-5-bac-combo.md) | Done |
| 3 | [Phase 3: Hiệu ứng trạng thái và cân bằng](./phase-03-hieu-ung-trang-thai.md) | Done |
| 4 | [Phase 4: Màn trận hiển thị chiêu và trạng thái](./phase-04-man-tran-hien-thi.md) | Done |
| 5 | [Phase 5: Kiểm chứng và tài liệu](./phase-05-kiem-chung-tai-lieu.md) | Done |

Thứ tự: 1 → 2 → 3 → 4 → 5. Phase 2 cần tên hiệu ứng của phase 1. Phase 4 cần sự kiện mới của phase 2 và 3.

## Success Criteria

- [x] Ít nhất 120 hiệu ứng fantasy được render. Mỗi loại chiêu có ≥ 3 chiêu ở mỗi bậc combo.
- [x] Bốc chiêu tất định theo seed, không lặp chiêu vừa dùng của cùng loại. Server replay ra cùng kết quả với client.
- [x] Trạng thái có tác dụng đúng như bảng ở phase 3, có test cho từng trạng thái và cho tương tác với khiên lửa và trùm.
- [x] Mô phỏng cân bằng nằm trong ngưỡng ở phase 3 (ở p = 0,7). Ở p = 0,85 chương 4–5 dễ hơn rõ, chờ người dùng quyết.
- [ ] Dung lượng FX nạp cho một trận ≤ 6 MB (đo bằng script). Chưa đạt: chặn vào trận 3,9 MB, nạp nền thêm ~12 MB.
- [x] typecheck, lint, test, build pass. Test e2e `battle.spec.ts` và `chapter-1.spec.ts` pass.

## Risks

- **Trận đang dở lúc deploy:** client cũ và server mới cho kết quả replay khác nhau, nên trận bị từ chối. Xem câu hỏi mở.
- **Mất cân bằng:** trạng thái cộng dồn với hệ số combo có thể làm trận quá dễ. Phase 3 có mô phỏng và giới hạn cộng dồn.
- **Hiệu ứng xấu hoặc lệch phong cách:** phải xem từng hiệu ứng trong gallery pixelfx trước khi nhận (phase 1).
- **Nạp FX chậm:** bộ chiêu mỗi trận bị giới hạn số lượng và được service worker cache.

## Câu hỏi mở

1. Trận đang dở đúng lúc deploy sẽ bị server từ chối (mất vàng của trận đó). Chấp nhận được không, hay cần thêm
   `rulesVersion` vào setup để server chạy luật cũ cho trận cũ?

<!-- slug: battle-skill-variety-combo-tiers -->
