---
title: "Phase 8: Bố cục tự nhiên"
status: done
---

# Phase 8: Bố cục tự nhiên

## Overview

Người dùng (2026-11-25): "thành trì, con đường, cây cối phải ngẫu nhiên chứ ko xếp thành hàng". Đổi bố cục 3 level
ngoài trời chương 1: đường uốn, cây thành cụm, mép rừng răng cưa, nhà rải lệch, tường thành có ụ lồi. 0 lượt PixelLab.

## Requirements

- [x] Đường uốn (Catmull-Rom qua điểm mốc, nét 1 ô; autotile `any` nở thành ~2 ô), nối đúng cổng/spawn
- [x] Cây thành cụm và mép rừng răng cưa bằng nhiễu mượt từ `hashNoise`, chừa lề quanh entity và đường
- [x] Nhà không đối xứng; Lexhold có ụ tường lồi
- [x] Giữ nguyên toạ độ/id entity, cổng, trận, Building
- [x] Sinh tất định (sinh 2 lần ra cùng file)
- [ ] Chương 2 (Ash_Forest, Ash_Stag_Grove): chờ người dùng quyết, ngoài phạm vi đã chốt

## Files

- `client/scripts/chapter-1/organic-layout.mjs` (mới): `organicOps`, `windingPathCells`
- `client/scripts/chapter-1/levels.mjs`: Lexhold, Misty_Fields, Misty_Village; entity tách hằng `*_ENTITIES` để tính vùng chừa trống

## Success Criteria

- `client/test/chapter-1-map.test.ts` pass (biên kín, đi tới mọi đích, trận hướng dẫn chắn cổng nam, ch1-field cắt đường chính)
- Ảnh dựng 3 level không còn hàng cây/nhà thẳng hàng
