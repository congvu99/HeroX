// Công trình và cây trên bản đồ thế giới: ảnh tĩnh nền trong suốt, cắt thành ô 32 px thay ô Kenney cùng tên
// (bảng ghi đè ở client/scripts/chapter-1/pixellab-tile-overrides.mjs). Cỡ ảnh = số ô × 32 px.
import { CREDIT, STYLE_REF } from './job-factory.mjs';

const TILE_PX = 32;

// Cùng phong cách nền sân trận (fantasy, đổ bóng chi tiết, chất liệu rõ) để bản đồ và màn trận liền một thế giới.
// Không ghi "night"/"dark": lớp ánh sáng theo level đã nhân MULTIPLY lên map, ảnh gốc tối sẵn sẽ bị đục.
const MAP_STYLE =
  'high fantasy medieval, detailed shading, rich stone and wood textures, top-down 3/4 pixel art, ' +
  'front facade facing the viewer, clean readable silhouette, transparent background';
const MAP_NEGATIVE =
  'text, watermark, characters, people, ground, grass patch, cast shadow, isometric, perspective tilt, ' +
  'night, strong color cast, blurry';

/** Công trình/cây rộng `columns` × `rows` ô: ảnh vừa khít khung để cắt thẳng thành ô. */
function mapStructure(id, title, prompt, { columns, rows, seed }) {
  return {
    kind: 'single',
    id,
    path: `tiles/pixellab/${id}.png`,
    prompt: `${prompt}, filling the whole frame edge to edge, ${MAP_STYLE}`,
    negative: MAP_NEGATIVE,
    seed,
    size: { width: columns * TILE_PX, height: rows * TILE_PX },
    view: 'high top-down',
    direction: 'south',
    animations: ['still'],
    reference: STYLE_REF,
    credit: CREDIT(`${title} bản đồ (PixelLab)`, `sinh tĩnh ${columns * TILE_PX}x${rows * TILE_PX}, cắt ô ${TILE_PX} px thay ô Kenney cùng tên`),
  };
}

export const HOUSE_ORANGE_JOB = mapStructure(
  'house-orange',
  'Nhà mái cam',
  'small medieval village cottage, orange clay tile roof with one small dormer window, roof covers the top two thirds, ' +
    'timber and plaster front wall along the bottom with a wooden door in the center and one window on each side',
  { columns: 3, rows: 3, seed: 74110 },
);

export const HOUSE_GREY_JOB = mapStructure(
  'house-grey',
  'Nhà đá mái xám',
  'small medieval stone house, grey slate roof with one small dormer window, roof covers the top two thirds, ' +
    'grey stone front wall along the bottom with a wooden door in the center and one window on each side',
  { columns: 3, rows: 3, seed: 74111 },
);

export const TREE_PINE_JOB = mapStructure('tree-pine', 'Cây thông', 'single small round green oak tree, lush leafy canopy, short brown trunk', { columns: 1, rows: 1, seed: 74120 });
export const TREE_AUTUMN_JOB = mapStructure('tree-autumn', 'Cây lá thu', 'single small round autumn tree, golden orange leafy canopy, short brown trunk', { columns: 1, rows: 1, seed: 74121 });
export const TREE_CONE_AUTUMN_JOB = mapStructure('tree-cone-autumn', 'Cây thông lá thu', 'single small conical fir tree with orange autumn needles, short brown trunk', { columns: 1, rows: 1, seed: 74122 });

// Nền ngoài trời: cỏ (lower) ↔ đường đất (upper), ô 32 px vẽ 1:1 (cùng độ nét với nhà PixelLab). Thay cỏ Kenney
// phẳng màu tươi, là phần chiếm nhiều diện tích nhất nên quyết định cả bản đồ có ra chất fantasy hay không.
export const GRASS_PATH_TILESET_JOB = {
  kind: 'tileset',
  id: 'grass-path-tileset',
  path: 'tiles/pixellab/grass-path-tileset.png',
  tileset: {
    lower: 'lush fantasy meadow grass, rich deep green with subtle darker tufts and tiny wildflowers, detailed texture',
    upper: 'worn earthen dirt road with small pebbles and wheel ruts, warm brown, detailed texture',
    transition: 'grass edge overhanging the dirt road',
    tileSize: 32,
    transitionSize: 0,
    shading: 'detailed shading',
    detail: 'highly detailed',
  },
  seed: 74130,
  // Địa hình PixelLab thực sự vẽ thành đường đất (xem ảnh ô toàn lower): lần sinh 2026-11-25 ra lower = đất dù mô tả lower là cỏ.
  terrain: 'lower',
  reference: STYLE_REF,
  credit: CREDIT('Tileset cỏ - đường đất bản đồ (PixelLab)', 'tileset Wang 16 ô 32 px, ghép sheet 4 cột + bảng góc .json'),
};

// Tường thành ↔ cỏ (Lexhold): tường đá nổi cao (transition 0.5) nối liền mọi hướng. Nền cỏ dùng lại đúng ô cỏ của
// tileset đường (id ô "toàn upper", ảnh thật là cỏ) để chân tường không lệch màu.
export const CASTLE_WALL_TILESET_JOB = {
  kind: 'tileset',
  id: 'castle-wall-tileset',
  path: 'tiles/pixellab/castle-wall-tileset.png',
  tileset: {
    lower: 'lush fantasy meadow grass, rich deep green',
    upper: 'top of a thick medieval castle rampart, weathered grey stone walkway with crenellated battlements, mossy cracks',
    transition: 'tall grey cut-stone castle wall face',
    tileSize: 32,
    transitionSize: 0.5,
    shading: 'detailed shading',
    detail: 'highly detailed',
    lowerBaseTileId: '9421d6d0-8422-44ca-a55b-a3f55e03186b',
  },
  seed: 74131,
  // Đặt theo ảnh thật sau khi sinh (xem ô phủ kín), không theo mô tả.
  terrain: 'upper',
  reference: STYLE_REF,
  credit: CREDIT('Tileset tường thành - cỏ bản đồ (PixelLab)', 'tileset Wang 16 ô 32 px, ghép sheet 4 cột + bảng góc .json'),
};

// Tháp góc thành Lexhold (con dấu 3×3): đứng trên tường thành, nền trong suốt để tường tileset lót bên dưới.
export const CASTLE_TOWER_JOB = mapStructure(
  'castle-tower',
  'Tháp thành',
  'squat round medieval castle tower seen from the front, grey cut-stone masonry, crenellated battlement top, ' +
    'one narrow arrow slit window, mossy stone base',
  { columns: 3, rows: 3, seed: 74140 },
);

// Cổng thành 2×2 ô: hàng trên là vòm đá (dùng riêng làm cổng đóng trên tường), hàng dưới là lối cổng mở có ánh sáng.
export const CASTLE_GATE_JOB = mapStructure(
  'castle-gate',
  'Cổng thành',
  'medieval castle gatehouse arch seen from the front, grey cut-stone arch with keystone on the top half, ' +
    'open heavy wooden doors with iron bands on the bottom half revealing a warm lit passage',
  { columns: 2, rows: 2, seed: 74141 },
);

// Mặt tiền nhà nguyện 12×4 ô vẽ liền một ảnh (không lặp ô giữa) để mái, cửa sổ, cổng vòm không lộ đường nối.
export const CHAPEL_FRONT_JOB = mapStructure(
  'chapel-front',
  'Mặt tiền nhà nguyện',
  'wide medieval stone chapel facade seen from the front, grey slate roof across the top half with a small bell gable ' +
    'in the center, grey stone wall on the bottom half with tall arched stained glass windows evenly spaced, ' +
    'large arched wooden double door exactly in the bottom center',
  { columns: 12, rows: 4, seed: 74142 },
);

export const MAP_STRUCTURE_JOBS = [HOUSE_ORANGE_JOB, GRASS_PATH_TILESET_JOB, CASTLE_WALL_TILESET_JOB, HOUSE_GREY_JOB, TREE_PINE_JOB, TREE_AUTUMN_JOB, TREE_CONE_AUTUMN_JOB, CASTLE_TOWER_JOB, CASTLE_GATE_JOB, CHAPEL_FRONT_JOB];
