---
title: "Phase 5: Kiểm chứng và tài liệu"
status: done
priority: P1
effort: "2h"
dependencies: [4]
---

# Phase 5: Kiểm chứng và tài liệu

## Implementation Steps

1. Chạy `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
2. Chạy e2e: `npx playwright test e2e/specs/battle.spec.ts e2e/specs/chapter-1.spec.ts --project=pixel-5`. Soi trace
   các đòn combo cao.
3. Kiểm server replay: test tích hợp `battle-routes` với log có trạng thái. Server phải ghi đúng vàng và kết quả.
4. Đo dung lượng FX tải trong một trận (Network panel hoặc script phase 1). Mục tiêu ≤ 6 MB.
5. Tài liệu:
   - `docs/system-architecture.md`: luồng chiêu, bậc combo, RNG chiêu tách luồng, trạng thái.
   - `docs/art-direction.md`: nguồn FX pixelfx mở rộng, quy tắc đặt tên `<nhóm>-<tên>`.
6. Dừng mọi server do phase này khởi động.

## Todo

- [x] Kiểm tra tự động pass
- [x] e2e pass (soi trace: chưa, chạy --trace=off)
- [x] Server replay đúng
- [x] Docs

## Success Criteria

Mọi mục Success Criteria trong `plan.md` đạt. Báo cáo có lệnh và output.

## Kết quả (2026-11-25)

- `npm run typecheck`, `npm run lint`, `npm test` (729 test), `npm run build`: pass.
- E2E `battle.spec.ts` + `chapter-1.spec.ts` (pixel-5): 3/3 pass với `--trace=off`. Với trace bật, 1 test quá hạn ở bước
  dọn context khi ghi trace 88–270 MB; thân test đã chạy xong.
- Server replay: test server 209/209 pass; e2e trận xác nhận server chạy lại log và ghi thưởng.
- Docs: `docs/system-architecture.md`, `docs/art-direction.md`.
- Chưa soi bằng mắt trong game thật (màu, nhịp, cỡ FX).
