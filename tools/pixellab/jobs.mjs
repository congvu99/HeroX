// Khai báo asset sinh bằng PixelLab theo dạng dữ liệu. generate.mjs đọc file này.
// Thêm asset cho chương mới = thêm phần tử vào ASSET_JOBS (id duy nhất, path tính từ assets/).
//
// kind:
//  - 'hero-sheet': nhân vật nhiều động tác, ghép vào sheet LPC ô 192 (walk 9 cột 4 hàng; battle row0).
//  - 'single': 1 ảnh tĩnh (quái, trùm, chân dung, npc, prop), đặt vào khung frameSize chân chạm đáy.
//
// Màu quái/trùm giữ TRUNG TÍNH: client nhuộm MULTIPLY lúc chạy (elite/shield/hurt).
// reference: ảnh mẫu phong cách có thật trong repo (test kiểm tồn tại).
import { battleMonster, monster, portrait, CREDIT, BASE_STYLE, STYLE_REF } from './job-factory.mjs';
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

// Bản trận chỉ cho quái có trong trận: quỷ tinh anh (`elite-demon`) chưa gắn loại quái nào ở client
// (tinh anh là quái thường nhuộm màu), sinh bản trận cho nó là phí lượt.
const ELITE_DEMON_ID = 'elite-demon';
// Seed gốc của tiểu quỷ ở cỡ 128 ra bóng đen không chi tiết.
const CHAPTER_1_BATTLE_OVERRIDES = {
  imp: { promptPrefix: 'fully shaded ash-grey skin with visible details, not a silhouette', seed: 11011 },
};
const CHAPTER_1_BATTLE_MONSTERS = CHAPTER_1_MONSTERS.filter((job) => job.id !== ELITE_DEMON_ID).map((job) =>
  battleMonster(job, CHAPTER_1_BATTLE_OVERRIDES[job.id]),
);

const CHAPTER_1_NPCS = [
  portrait('keeper', 'keeper', 'old grizzled fortress keeper, hooded cloak, weary', 12001),
  portrait('smith', 'smith', 'burly blacksmith, leather apron, hammer', 12002),
  portrait('villager', 'villager', 'frightened medieval villager, plain clothes', 12003),
];

// Hero GIỮ sheet LPC hiện có: animation PixelLab (rotate/animate) không đọc được ở hướng lưng/trái
// và frame giật (thử 2026-11-20). HERO_JOB giữ lại để tham khảo nhưng KHÔNG đưa vào danh sách chạy.

// Hero chỉ-trận (hero-battle): client chỉ dùng hàng hướng LÊN (UP_ROW, hero-battle-animations.ts),
// nên chỉ sinh hướng bắc để né lỗi hướng lưng/trái. Không xoay, không walk. Tái dùng prompt/seed
// của HERO_JOB để giữ phong cách khớp walk sheet LPC trên bản đồ.
const HERO_BATTLE_JOB = {
  kind: 'hero-battle',
  id: 'hero-battle',
  prompt: HERO_JOB.prompt,
  negative: HERO_JOB.negative,
  seed: HERO_JOB.seed,
  size: HERO_JOB.size,
  cellSize: HERO_JOB.cellSize,
  directions: HERO_JOB.directions,
  reference: STYLE_REF,
  battleMoves: HERO_JOB.battleMoves,
  credit: CREDIT('Hero Hiệp sĩ Thánh Ngôn - động tác trận (PixelLab)', 'sinh base hướng bắc + animate từng động tác, hàng UP ô 192'),
};

// Nền sân trận: ảnh tĩnh CÓ nền (noBackground:false), không đặt khung. Cỡ 192x352 để client phóng
// x2 (ARENA_TILE_SCALE) ra 384x704, khớp lưới 6x11 ô 64px của battle-arena-layout.
// file 'battle-arena' là nền chung; 'battle-<theme>' là nền riêng của theme sân (client ưu tiên nếu có).
function battleBackdrop(id, file, title, scene, seed) {
  return {
    kind: 'single',
    id,
    path: `backgrounds/${file}.png`,
    prompt: `top-down 3/4 battle arena, ${scene}, no characters, pixel art`,
    negative: 'characters, people, monsters, text, watermark, ui',
    seed,
    size: { width: 192, height: 352 },
    view: 'high top-down',
    noBackground: false,
    animations: ['still'],
    reference: STYLE_REF,
    credit: CREDIT(`Nền sân trận ${title} (PixelLab)`, 'ảnh nền tĩnh 192x352, client phóng x2 phủ sân 6x11 ô'),
  };
}

const BATTLE_BACKDROP_JOBS = [
  battleBackdrop(
    'battle-backdrop',
    'battle-arena',
    'chung',
    'bright sacred temple courtyard, pale sunlit stone floor, marble pillars along the sides, holy god rays and ' +
      'glowing sunlight from above, ethereal dreamy haze, lush green vines and small trees, soft magical glow',
    73512,
  ),
  battleBackdrop(
    'battle-backdrop-broken-heaven',
    'battle-broken-heaven',
    'đền mặt trăng',
    'moonlit celestial temple courtyard at night, pale silver marble floor with glowing moon sigil runes, ' +
      'crescent moon and stars above, ethereal blue mist, luminous white flowers and silver trees, soft magical glow',
    73520,
  ),
  battleBackdrop(
    'battle-backdrop-hellmaw',
    'battle-hellmaw',
    'vực thẳm địa ngục',
    'cracked obsidian platform floating over a bottomless hellish abyss, glowing lava fissures in the floor, ' +
      'rivers of fire far below the edges, floating embers, crimson and violet infernal glow, mystical atmosphere',
    73530,
  ),
  battleBackdrop(
    'battle-backdrop-fields',
    'battle-fields',
    'đồng hoang',
    'misty moorland clearing at dusk, worn dirt path over wild grass, old standing stones and a broken wooden fence, ' +
      'scattered wildflowers, drifting fog and fireflies, soft golden twilight glow, mystical atmosphere',
    73540,
  ),
  battleBackdrop(
    'battle-backdrop-village',
    'battle-village',
    'làng bỏ hoang',
    'abandoned medieval village square at dusk, cracked cobblestone floor, timber houses with dim lantern-lit windows ' +
      'along the sides, old stone well, hanging banners, drifting mist, warm lantern glow, mystical atmosphere',
    73550,
  ),
  battleBackdrop(
    'battle-backdrop-lair',
    'battle-lair',
    'hang trùm',
    'dark ritual cavern lair, rough stone floor with a glowing red summoning circle, bones and rusted cages along the walls, ' +
      'flickering braziers, hanging chains, ominous crimson and purple glow, mystical atmosphere',
    73560,
  ),
  battleBackdrop(
    'battle-backdrop-ash-forest',
    'battle-ash-forest',
    'rừng tro',
    'empty burned ash forest clearing, wide grey ash-covered ground, charred black tree trunks along the sides, ' +
      'smouldering embers, falling ash like snow, hazy orange glow through smoke, mystical atmosphere',
    // Seed 73570 vẽ lọt một người đứng giữa đường dù đã phủ định nhân vật.
    73571,
  ),
  battleBackdrop(
    'battle-backdrop-catacomb',
    'battle-catacomb',
    'hầm mộ thánh',
    'ancient holy catacomb hall, worn stone tile floor with faded sacred mosaic, stone sarcophagi and skull-lined niches ' +
      'along the walls, candles and dim censers, pale green spectral mist, faint holy light, mystical atmosphere',
    73580,
  ),
];

// Hero trong trận nhìn từ LƯNG (client đặt hiệp sĩ ở dưới, nhìn lên phía quái): 1 ảnh tĩnh pixflux,
// chuyển động và hiệu ứng (thở, lao chém, hào quang phép) làm bằng tween ở client thay vì animate
// của PixelLab (giật khung). Sinh 128 để đủ chi tiết, client vẽ 1:1 (tương đương LPC 64 x2).
const HERO_BACK_JOB = {
  kind: 'single',
  id: 'hero-back',
  path: 'sprites/hero/hero_battle_back.png',
  prompt:
    'back view of a crusader holy knight seen from behind, silver plate armor, closed great helm, ' +
    'long flowing red cape with white cross, large red cross kite shield on left arm, longsword raised in right hand ' +
    'glowing with faint holy light, heroic stance, tall proportions, ' +
    BASE_STYLE,
  negative: 'face visible, front view, chibi, big head, comedic, blurry, text',
  seed: 73430,
  size: { width: 128, height: 128 },
  direction: 'north',
  frameSize: 128,
  animations: ['still'],
  reference: STYLE_REF,
  credit: CREDIT('Hero Hiệp sĩ Thánh Ngôn - dáng lưng trong trận (PixelLab)', 'sinh tĩnh hướng bắc 128, đặt khung 128 chân chạm đáy; chuyển động làm bằng tween'),
};

// HERO_BATTLE_JOB KHÔNG vào danh sách chạy: thử 2026-11-25 cho sheet idle/slash frame giật, nhân vật
// nhỏ lệch góc ô, kém sheet LPC hiện có. Giữ lại để tham khảo; hero trong trận vẫn dùng sheet LPC.
export const ASSET_JOBS = [
  ...CHAPTER_1_MONSTERS,
  ...CHAPTER_1_NPCS,
  ...CHAPTER_2_5_JOBS,
  ...BATTLE_BACKDROP_JOBS,
  HERO_BACK_JOB,
  ...CHAPTER_1_BATTLE_MONSTERS,
];
void HERO_JOB;
void HERO_BATTLE_JOB;
