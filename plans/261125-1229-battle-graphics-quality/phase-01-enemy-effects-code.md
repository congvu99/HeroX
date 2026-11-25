# Phase 1 — Hiệu ứng quái và sân bằng code (0 lượt)
Trạng thái: done

## Files
- Mới `client/src/render/enemy-battle-effects.ts`, cùng kiểu `hero-battle-back.ts`.
- Sửa `client/src/render/battle-actors.ts`: gọi hiệu ứng trong `showEnemy`, `enemyAct('hurt')`, `defeatEnemy`.

## Việc
1. Quái thở (scaleY) thay cho nhún 3 px; hào quang sau lưng theo cấp, dùng `TEXTURE_KEYS.light`: tinh anh cam, trùm đỏ tím, quái thường không có.
2. Trúng đòn: giữ flash trắng hiện có, thêm tia sáng và hạt văng (blend ADD).
3. Chết: tan thành tro (alpha + hạt bay lên) thay cho chỉ mờ dần.
4. Đòn chí mạng: tìm cơ chế rung camera đã có (`cameras.main.shake`) trước, chỉ thêm khi chưa có.
5. Không làm trùng hiệu ứng pixelfx đã render (`client/public/fx/`, `assets/fx/fx-manifest.json`): đối chiếu danh sách trước.

## Kiểm
- tsc, eslint, vitest; ảnh chụp 1 trận thường và 1 trận trùm với sprite cũ.
