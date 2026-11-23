// Khai báo asset sinh bằng PixelLab theo dạng dữ liệu. generate.mjs đọc file này.
// Thêm asset cho chương mới = thêm phần tử vào ASSET_JOBS (id duy nhất, path tính từ assets/).
//
// kind:
//  - 'hero-sheet': nhân vật nhiều động tác, ghép vào sheet LPC ô 192 (walk 9 cột 4 hàng; battle row0).
//  - 'single': 1 ảnh tĩnh (quái, trùm, chân dung, npc, prop), đặt vào khung frameSize chân chạm đáy.
//
// Màu quái/trùm giữ TRUNG TÍNH: client nhuộm MULTIPLY lúc chạy (elite/shield/hurt).
// reference: ảnh mẫu phong cách có thật trong repo (test kiểm tồn tại).
import { monster, portrait, CREDIT, BASE_STYLE, STYLE_REF } from './job-factory.mjs';
import { CHAPTER_2_5_JOBS } from './jobs-chapters-2-5.mjs';

/** Hero: 1 base + xoay 4 hướng, animate walk + các động tác trận. Ô 192 để khớp loader hiện tại. */
const HERO_JOB = {
  kind: 'hero-sheet',
  id: 'hero',
  prompt:
    'crusader holy knight, silver plate armor, closed great helm, white tabard with red cross, large red cross kite shield, red cape, longsword, tall heroic proportions, ' +
    BASE_STYLE,
  negative: 'chibi, big head, round helmet, comedic, blurry',
  seed: 73421,
  size: { width: 64, height: 64 },
  cellSize: 192,
  columns: 9,
  directions: 4,
  reference: STYLE_REF,
  walk: { id: 'hero-walk', path: 'sprites/hero/hero_walk.png' },
  battleMoves: [
    { id: 'hero-idle', path: 'sprites/hero/hero_idle.png', action: 'idle breathing', actionPrompt: 'standing guard, subtle idle', columns: 2 },
    { id: 'hero-slash', path: 'sprites/hero/hero_slash.png', action: 'sword slash attack', actionPrompt: 'overhead sword slash', columns: 6 },
    { id: 'hero-spellcast', path: 'sprites/hero/hero_spellcast.png', action: 'cast holy spell', actionPrompt: 'raising sword, holy light cast', columns: 7 },
    { id: 'hero-hurt', path: 'sprites/hero/hero_hurt.png', action: 'hurt and fall down', actionPrompt: 'struck and collapsing', columns: 6 },
  ],
  credit: CREDIT('Hero Hiệp sĩ Thánh Ngôn (PixelLab)', 'sinh base + xoay 4 hướng + animate; ghép sheet ô 192 bằng tools/pixellab/generate.mjs'),
};

// --- Chương 1 (thay hình tạm LPC/DCSS) ---
const CHAPTER_1_MONSTERS = [
  monster('imp', 'imp', 'small horned imp demon, clawed', { seed: 11001 }),
  monster('skeleton', 'skeleton', 'skeletal warrior with rusty sword and shield', { seed: 11002 }),
  monster('ghoul', 'ghoul', 'rotting ghoul, hunched, long claws', { seed: 11003 }),
  monster('scarecrow-demon', 'scarecrow-demon', 'towering scarecrow demon boss, burlap head, crow wings, scythe', { frameSize: 128, seed: 11004, boss: true }),
  monster('elite-demon', 'elite-demon', 'red devil elite demon, muscular, horns', { frameSize: 96, seed: 11005 }),
];

const CHAPTER_1_NPCS = [
  portrait('keeper', 'keeper', 'old grizzled fortress keeper, hooded cloak, weary', 12001),
  portrait('smith', 'smith', 'burly blacksmith, leather apron, hammer', 12002),
  portrait('villager', 'villager', 'frightened medieval villager, plain clothes', 12003),
];

// Hero GIỮ sheet LPC hiện có: animation PixelLab (rotate/animate) không đọc được ở hướng lưng/trái
// và frame giật (thử 2026-11-20). HERO_JOB giữ lại để tham khảo nhưng KHÔNG đưa vào danh sách chạy.
export const ASSET_JOBS = [...CHAPTER_1_MONSTERS, ...CHAPTER_1_NPCS, ...CHAPTER_2_5_JOBS];
void HERO_JOB;
