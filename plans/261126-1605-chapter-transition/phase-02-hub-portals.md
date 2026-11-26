---
title: "Phase 2: Tuyến cổng Lexhold làm trung tâm"
status: done
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Tuyến cổng Lexhold làm trung tâm

## Bối cảnh (đã đọc)

- Map sinh từ mô tả lưới ký tự: `client/scripts/chapter-N/levels.mjs` và `client/scripts/lib/generate-chapter.mjs`,
  chạy `npm run generate:chapter-N -w @herox/client`. Đã kiểm: sinh lại cả 5 chương ra file y hệt bản commit.
- Cổng và spawn hiện có:
  - Lexhold: spawn `start`, `from-fields`; cổng `Misty_Fields/from-lexhold`, `Ash_Forest/from-lexhold`.
  - Điểm vào: Ash_Forest `from-lexhold`; Saint_Catacomb, Hellmaw, Broken_Heaven `from-fields`.
  - Không level nào của chương 2–5 có cổng về Lexhold.
- Khoá cổng tra theo `levelId` trên mọi chương (`levelGateState`), nên cổng mới đặt ở Lexhold vẫn bị khoá đúng:
  Saint_Catacomb (trong `levelGates` chương 2), Hellmaw (trong `levelGates` chương 3, `chapter-3.ts:74`), Broken_Heaven (trong `levelGates` chương 4).
  Không cần sửa dữ liệu truyện.

## Files

- Modify `client/scripts/chapter-1/levels.mjs`: Lexhold thêm 3 cổng tới `Saint_Catacomb/from-fields`,
  `Hellmaw/from-fields`, `Broken_Heaven/from-fields`, và 4 spawn về `from-ash-forest`, `from-catacomb`,
  `from-hellmaw`, `from-heaven` đặt cạnh cổng tương ứng.
- Modify `client/scripts/chapter-2..5/levels.mjs`: level đầu chương thêm cổng về `Lexhold/<spawn về>` cạnh điểm vào.
- Regenerate `assets/maps/chapter-*.ldtk` và `.ldtkl`.
- Modify `client/test/chapter-1-map.test.ts`: bỏ ngoại lệ `FUTURE_LEVEL`, cập nhật `CHAPTER_1_EXPECTED` cho Lexhold.
- Create test tuyến cổng chung: mọi cổng của mọi chương trỏ tới level và spawn có thật trong một project nào đó; level
  đầu chương 2–5 có cổng về Lexhold; Lexhold có cổng tới điểm vào của mọi chương 2–5.

## Steps

1. Viết test tuyến cổng trước, chạy đỏ.
2. Đọc lưới Lexhold, chọn ô tường trống cho 3 cổng (cùng kiểu `GATE_H`/`GATE_V`). Không đủ chỗ hợp lý thì dừng, hỏi
   người dùng; không tự nới kích thước level.
3. Sửa mô tả level, sinh lại map, test xanh; test đường đi tới được (reachable) của chương 1 vẫn pass.

## Success Criteria

- Test tuyến cổng pass; `chapter-1-map.test.ts` không còn ngoại lệ.
- Cổng mới không chặn lối đi cũ.

## Rollback

Revert commit; map là file sinh ra nên sinh lại từ mô tả cũ.
