// Bố cục tự nhiên cho level ngoài trời: đường uốn qua các điểm mốc, cây mọc thành cụm, mép rừng răng cưa.
// Mọi phép rải dùng hashNoise theo seed nên sinh lại ra đúng file cũ. Kết quả là lệnh 'at' của rasterize.
import { hashNoise } from '../../../tools/lib/image-ops.mjs';
import { GRID } from '../../../tools/lib/ldtk-project.mjs';

const CURVE_STEPS_PER_CELL = 4;
/** Ô quanh cổng, spawn được để trống rộng hơn để lối vào không bị cây che. */
const OPEN_ENTITY_IDS = new Set(['Portal', 'PlayerSpawn']);
const OPEN_ENTITY_MARGIN = 2;
const ENTITY_MARGIN = 1;
const PATH_MARGIN = 1;

const cellKey = (x, y) => `${x},${y}`;

/** Nhiễu mượt (nội suy giữa các nút lưới cỡ `scale`), cho cụm và mép rừng liền khối thay vì lốm đốm. */
function smoothNoise(x, y, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const ease = (t) => t * t * (3 - 2 * t);
  const tx = ease(gx - x0);
  const ty = ease(gy - y0);
  const top = hashNoise(x0, y0, seed) * (1 - tx) + hashNoise(x0 + 1, y0, seed) * tx;
  const bottom = hashNoise(x0, y0 + 1, seed) * (1 - tx) + hashNoise(x0 + 1, y0 + 1, seed) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Điểm trên đường cong Catmull-Rom qua các mốc (mốc đầu/cuối nhân đôi để đường đi đúng qua chúng). */
function curvePoints(points) {
  const padded = [points[0], ...points, points.at(-1)];
  const result = [];
  for (let index = 1; index < padded.length - 2; index++) {
    const [p0, p1, p2, p3] = padded.slice(index - 1, index + 3);
    const steps = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * CURVE_STEPS_PER_CELL));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const blend = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
      result.push([blend(p0[0], p1[0], p2[0], p3[0]), blend(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return result;
}

/**
 * Ô của một đường rộng `width` ô đi qua các mốc `points` ([x, y], toạ độ ô góc trên-trái của nét).
 * `clip` giới hạn trong vùng trong tường để đường không đục thủng biên level.
 */
export function windingPathCells(points, width, clip) {
  const cells = new Map();
  for (const [px, py] of curvePoints(points)) {
    const left = Math.round(px);
    const top = Math.round(py);
    for (let dy = 0; dy < width; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const x = left + dx;
        const y = top + dy;
        if (x >= clip.x0 && x <= clip.x1 && y >= clip.y0 && y <= clip.y1) cells.set(cellKey(x, y), [x, y]);
      }
    }
  }
  return [...cells.values()];
}

/** Ô cần để trống: entity (cổng, spawn rộng hơn) và lề quanh đường. */
function reservedCells(entities, pathCells) {
  const reserved = new Set();
  const reserveAround = (x0, y0, width, height, margin) => {
    for (let y = y0 - margin; y < y0 + height + margin; y++) for (let x = x0 - margin; x < x0 + width + margin; x++) reserved.add(cellKey(x, y));
  };
  for (const entity of entities) {
    const [width, height] = entity.size ?? [GRID, GRID];
    const margin = OPEN_ENTITY_IDS.has(entity.id) ? OPEN_ENTITY_MARGIN : ENTITY_MARGIN;
    reserveAround(entity.cell[0], entity.cell[1], Math.ceil(width / GRID), Math.ceil(height / GRID), margin);
  }
  for (const [x, y] of pathCells) reserveAround(x, y, 1, 1, PATH_MARGIN);
  return reserved;
}

/** Cụm cây quanh tâm (cx, cy): bán kính dao động theo nhiễu, chừa vài khe để cụm không thành khối vuông. */
function groveCells({ center: [cx, cy], radius, seed }) {
  const cells = [];
  const reach = Math.ceil(radius * 1.4);
  for (let y = cy - reach; y <= cy + reach; y++) {
    for (let x = cx - reach; x <= cx + reach; x++) {
      const edge = radius * (0.65 + 0.7 * smoothNoise(x, y, 2, seed));
      if (Math.hypot(x - cx, y - cy) <= edge && hashNoise(x, y, seed + 1) > 0.12) cells.push([x, y]);
    }
  }
  return cells;
}

/** Mép rừng ăn vào trong vùng đi được 0..`depth` ô, độ sâu đổi dần theo nhiễu để mép răng cưa tự nhiên. */
function raggedEdgeCells({ x0, y0, x1, y1 }, depth, seed) {
  const cells = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const distance = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      if (distance >= depth) continue;
      if (distance < Math.floor(smoothNoise(x, y, 3, seed) * (depth + 1))) cells.push([x, y]);
    }
  }
  return cells;
}

/**
 * Lệnh rasterize cho nền tự nhiên: đường uốn (`=`) rồi cây (`treeChar`) ở cụm và mép rừng, bỏ ô quanh entity và đường.
 * Đặt TRƯỚC nhà, đồ vật trong `ops` để các khối đó ghi đè lên cây nếu chồng nhau.
 * @param {{ interior: {x0:number,y0:number,x1:number,y1:number}, entities: object[], paths?: {points:number[][], width:number}[],
 *   groves?: {center:number[], radius:number, seed:number}[], ragged?: {depth:number, seed:number}, treeChar?: string }} layout
 */
export function organicOps({ interior, entities, paths = [], groves = [], ragged, treeChar = 'Y' }) {
  const pathCells = paths.flatMap(({ points, width }) => windingPathCells(points, width, interior));
  const reserved = reservedCells(entities, pathCells);
  const inside = ([x, y]) => x >= interior.x0 && x <= interior.x1 && y >= interior.y0 && y <= interior.y1;
  const treeCells = [...groves.flatMap(groveCells), ...(ragged ? raggedEdgeCells(interior, ragged.depth, ragged.seed) : [])]
    .filter((cell) => inside(cell) && !reserved.has(cellKey(...cell)));
  const uniqueTrees = [...new Map(treeCells.map((cell) => [cellKey(...cell), cell])).values()];
  return [
    ...(pathCells.length > 0 ? [['at', '=', pathCells]] : []),
    ...(uniqueTrees.length > 0 ? [['at', treeChar, uniqueTrees]] : []),
  ];
}
