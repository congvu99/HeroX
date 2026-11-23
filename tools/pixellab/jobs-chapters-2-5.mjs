// Asset PixelLab cho chương 2–5 (quái/trùm + NPC thoại). Tách khỏi jobs.mjs để dễ theo dõi.
// Trùm (boss: true) đồng thời là chân dung thoại (dialog-runner trỏ về cùng PNG sprites/monsters/*).
import { monster, portrait } from './job-factory.mjs';

// Chương 2 — Rừng Tro: xám tro, cây cháy.
const CHAPTER_2 = [
  monster('ash-wolf', 'ash-wolf', 'gaunt ash-grey wolf, ember eyes, singed fur', { seed: 21001 }),
  monster('ash-sprite', 'ash-sprite', 'floating ember sprite, swirling ash wisp, faint glow', { seed: 21002 }),
  monster('ash-stag', 'ash-stag', 'towering demonic stag boss, charred antlers, burning sockets, ash-cloaked body', { frameSize: 128, seed: 21003, boss: true }),
];

// Chương 3 — Hầm Mộ Thánh: xương, vải lễ, thánh đường hoang.
const CHAPTER_3 = [
  monster('red-cleric', 'red-cleric', 'hollow cleric in tattered ceremonial robes, carrying a dim censer', { seed: 31001 }),
  monster('bone-knight', 'bone-knight', 'armored skeletal knight, dented plate, broken greatsword', { seed: 31002 }),
  monster('nameless-bishop', 'nameless-bishop', 'towering faceless bishop boss, tall mitre, flowing vestments, crozier staff', { frameSize: 128, seed: 31003, boss: true }),
];

// Chương 4 — Vực Lửa: dung nham, quỷ lửa.
const CHAPTER_4 = [
  monster('fire-imp', 'fire-imp', 'small molten imp, cracked obsidian skin, glowing fissures', { seed: 41001 }),
  monster('lava-hound', 'lava-hound', 'hulking magma hound, hardened lava hide, ember maw', { seed: 41002 }),
  monster('antonym-demon', 'antonym-demon', 'towering two-faced demon lord boss, opposing masks, horned crown, cracked lava body', { frameSize: 128, seed: 41003, boss: true }),
];

// Chương 5 — Thiên Cung Vỡ: thiên thần sa ngã, hào quang vỡ.
const CHAPTER_5 = [
  monster('mute-cherub', 'mute-cherub', 'small wingless cherub with a sewn-shut mouth, cracked halo', { seed: 51001 }),
  monster('broken-seraph', 'broken-seraph', 'six-winged seraph with shattered wings, broken halo, trailing feathers', { seed: 51002 }),
  monster('fallen-angel', 'fallen-angel', 'towering fallen archangel boss, blackened wings, cracked halo, greatsword of light', { frameSize: 128, seed: 51003, boss: true }),
];

// NPC thoại mới (speaker chương 2–5).
const CHAPTER_2_5_NPCS = [
  portrait('forest-warden', 'forest-warden', 'solemn forest warden, bark-grey cloak, antlered hood, carved staff', 22001),
  portrait('crypt-warden', 'crypt-warden', 'hooded crypt warden, pale robes, lantern, keyring', 32001),
  portrait('chained-soul', 'chained-soul', 'gaunt tormented soul wrapped in heavy chains, faint glow', 42001),
  portrait('gate-seraph', 'gate-seraph', 'radiant guardian seraph, folded wings, gleaming gate keys', 52001),
];

export const CHAPTER_2_5_JOBS = [...CHAPTER_2, ...CHAPTER_3, ...CHAPTER_4, ...CHAPTER_5, ...CHAPTER_2_5_NPCS];
