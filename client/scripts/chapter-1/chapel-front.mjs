// Mặt tiền nhà nguyện làng (12×4 ô): mỗi ô một tên riêng để cắt liền từ một ảnh PixelLab, không lặp ô giữa.
// Chưa có ảnh thì lùi về ghép ô Kenney như bản cũ (mái xám, tường đá có cửa sổ, cổng vòm ở giữa).

export const CHAPEL_FRONT_COLUMNS = 12;
export const CHAPEL_FRONT_ROWS = 4;
/** Cột trái của cổng vòm 2 ô (cột 5–6 là giữa mặt tiền 12 ô). */
export const CHAPEL_GATE_COLUMN = 5;

const LAST_COLUMN = CHAPEL_FRONT_COLUMNS - 1;
const WINDOW_EVERY = 3;

export const chapelFrontTileName = (row, column) => `chapel_front_${row}_${column}`;

/** Lưới tên ô hàng × cột, dùng cho con dấu trong level và bảng cắt ảnh. */
export const CHAPEL_FRONT_TILES = Array.from({ length: CHAPEL_FRONT_ROWS }, (_, row) =>
  Array.from({ length: CHAPEL_FRONT_COLUMNS }, (_, column) => chapelFrontTileName(row, column)));

const isGateColumn = (column) => column === CHAPEL_GATE_COLUMN || column === CHAPEL_GATE_COLUMN + 1;

/** Chỉ số ô Kenney Tiny Town cho ô (hàng, cột) khi chưa có ảnh PixelLab; `glow` cho ô có cửa sổ. */
function kenneyTile(row, column, windowGlow) {
  const edge = (left, mid, right) => (column === 0 ? left : column === LAST_COLUMN ? right : mid);
  if (row === 0) return isGateColumn(column) ? ['town', 51, windowGlow] : ['town', edge(48, 49, 50)];
  if (row === 1) return ['town', edge(60, 61, 62)];
  if (row === CHAPEL_FRONT_ROWS - 1 && isGateColumn(column)) return ['town', column === CHAPEL_GATE_COLUMN ? 111 : 112];
  if (column > 0 && column < LAST_COLUMN && column % WINDOW_EVERY === 1) return ['town', 88, windowGlow];
  return ['town', edge(76, 77, 79)];
}

/** Mục bảng KENNEY_TILES cho mọi ô mặt tiền (thứ tự hàng rồi cột, cố định). */
export function chapelFrontKenneyTiles(windowGlow) {
  return Object.fromEntries(CHAPEL_FRONT_TILES.flatMap((names, row) =>
    names.map((name, column) => [name, kenneyTile(row, column, windowGlow)])));
}
