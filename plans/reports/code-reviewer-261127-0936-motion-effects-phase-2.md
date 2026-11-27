# Review GĐ2 P1+P2 (cây đung đưa, nền parallax)

Reviewer độc lập (g1:code-reviewer), 2026-11-27. Không có lỗi chặn (critical 0, high 0). Báo cáo do lead ghi lại vì subagent không được tạo file.

## Đã xác minh đúng

- `removeTileAt(x, y, true, false)` đúng chữ ký; cắt frame thất bại thì trả `null` trước khi gỡ tile, cây không bao giờ mất.
- Frame `tree-sway-<index>` thêm vào texture tileset dùng chung có kiểm `has()`, an toàn qua nhiều lần restart scene (cùng mẫu `hero-sprite.ts`).
- Depth, alpha (`tile.alpha × layer.opacity`), flip khớp cách builder vẽ tile.
- Map không thuộc atlas chương (test-room) không throw, không gắn listener.
- `removeParallaxBackdrop` không huỷ hai lần khi gọi lặp hoặc kèm `disable()`.

## Phát hiện và xử lý

| Mã | Nội dung | Xử lý |
|---|---|---|
| M1 | `SwayingTrees` chưa có test | Đã sửa: tách `treeImagePlacement` (thuần, có test), thêm `client/test/swaying-trees.test.ts` với Phaser giả |
| M2 | Hai nguồn bảng tile chương (`chapter-1-tile-data.ts` và `chapter-tile-names.ts`), quy tắc so khớp atlas khác nhau (`endsWith` và so đúng tên file) | **Chưa sửa**: đụng code cũ, cần hỏi chủ code |
| L1 | Sau `disable()` vẫn vẽ 354 image; image không tự cull | Đã sửa: `disable()` đặt tile lại vào tilemap và huỷ image; khi đang chạy thì ẩn cây ngoài khung nhìn |
| L2 | `splice(indexOf)` thiếu kiểm `-1` | Đã sửa |
| L3 | `setDisplaySize(layer.gridSize)` khác cách Phaser vẽ tile | Đã sửa: bỏ, giữ cỡ frame gốc |
| L4 | Plan phase 1 còn mô tả tween | Đã sửa: ghi rõ đổi sang một vòng POST_UPDATE |
| Ghi chú | Gom `tilesetTextureKeyFor` thành một biến; gọi `removeTileAt` trực tiếp trên layer | Đã sửa |

## Chưa kiểm tra

- Chữ ký API Phaser đối chiếu nhánh master trên GitHub, không phải đúng tag 4.2.1 (hook chặn đọc `node_modules`); typecheck với typings 4.2.1 cục bộ đã xanh.
- Chưa đo fps trên iPhone thật.
