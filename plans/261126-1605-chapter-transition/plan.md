---
title: "chapter-transition"
description: "Cổng xuyên chương với Lexhold làm trung tâm, và vào game ở đúng chương đang chơi"
status: completed
priority: P1
effort: "M"
tags: [map, story, chapter]
created: 2026-11-26
---

# chapter-transition

## Overview

Người chơi không sang được chương 2 vì game luôn nạp file map chương 1. `setActiveChapter` và `chapterForWordCounts`
(`client/src/maps/chapter-maps.ts:52,65`) không có nơi gọi. Cổng đông Lexhold trỏ `Ash_Forest`, nhưng level này nằm
ở project khác nên `world-scene.ts:696` bỏ qua cổng mà không báo gì. Chương 2–4 cũng không có cổng sang chương sau,
và Lexhold không có điểm xuất hiện cho người đi về.

Luật khoá cổng đã có và đúng: `levelGateState` (`shared/src/story/story-rules.ts:170`) cộng `levelGates` của từng
chương (ví dụ Ash_Forest cần epilogue chương 1 và 100 từ). Plan này không đổi luật khoá.

Nguồn: `plans/reports/brainstorm-261126-1557-chapter-transition.md`.

## Quyết định đã chốt (người dùng, 2026-11-26)

- Vào game thì nạp **chương đang chơi**, đặt người chơi ở điểm vào của chương đó.
- **Lexhold làm trung tâm**: Lexhold có cổng tới điểm vào của chương 2–5; mỗi level đầu chương có cổng về Lexhold.
- Mỗi chương giữ project LDtk riêng. Không đổi id level, spawn hay entity đang có, chỉ thêm mới.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Đổi chương giữa phiên và lúc vào game](./phase-01-chapter-switch-logic.md) | Done |
| 2 | [Phase 2: Tuyến cổng Lexhold làm trung tâm](./phase-02-hub-portals.md) | Done |
| 3 | [Phase 3: Kiểm chứng trong game và cập nhật docs](./phase-03-verify-and-docs.md) | Done |

**Thứ tự:** 1 → 2 → 3. Phase 1 dùng được ngay với cổng Lexhold → Ash_Forest đã có; phase 2 thêm các cổng còn thiếu.

## Contract

- **Outcome:** xong truyện chương N và đủ số từ thì đi qua cổng ở Lexhold sang chương N+1, không phải tải lại trang.
  Mở lại game thì vào điểm vào của chương đang chơi. Từ đầu mỗi chương 2–5 về được Lexhold.
- **Constraints:** không đổi luật khoá, tiến độ lưu (`GET/POST /story`), id hiện có; không sửa base scene ngoài điểm
  nối cổng và bước vào game của boot.
- **Non-goals:** gộp map, đổi mốc số từ, màn chọn chương, sửa nội dung truyện, cổng nối chuỗi giữa các chương.

## Success Criteria

- [x] Test đơn vị: tra chương chứa level; chọn chương khi vào game theo tiến độ truyện và số từ; điểm vào mỗi chương.
- [x] Test map: mọi cổng trỏ tới level có trong một project chương nào đó và spawn đích tồn tại (thay cho ngoại lệ
      `FUTURE_LEVEL` trong `chapter-1-map.test.ts`).
- [ ] Trong game: Lexhold → Ash_Forest khi đủ điều kiện; chưa đủ thì vẫn báo khoá như cũ; Ash_Forest → Lexhold;
      tải lại trang khi đang ở chương 2 thì vào Ash_Forest.
- [x] `npm run typecheck`, `npm run lint`, `npm test` pass; e2e `chapter-1.spec.ts` vẫn pass.

## Rủi ro

- Chuyển project giữa phiên: cache tileset theo namespace file map (`tilesetTextureKeyFor`), nhưng phải chắc world
  preload nạp đúng file `.ldtkl` của project mới. Phase 1 kiểm bằng chạy thật.
- Lexhold có thể không đủ chỗ trống cho 3 cổng mới; phase 2 đọc lưới level trước, chật thì hỏi người dùng vị trí.
- Người chơi cũ đang dở chương 2: vào game sẽ được đưa thẳng tới Ash_Forest. Đây là hành vi mong muốn.

## Kết quả (2026-11-26)

- Đã chạy thật: cổng đông khoá khi chưa xong chương 1; xong chương 1 và đủ từ thì sang Ash_Forest/from-lexhold, tileset
  chương 2 hiện đúng; cổng bắc Ash_Forest về Lexhold/from-ash-forest; 3 cổng mới không bị chắn. Ảnh trong `assets/`.
- `npm test` 744/744, e2e 14/14, typecheck và lint sạch.
- Chưa kiểm: tải lại trang khi đang ở chương 2 (dev không giữ tiến độ; logic chọn chương có unit test, đường boot chưa
  chạy thật). Bảng nhiệm vụ che một phần cổng bắc trái của Lexhold.
