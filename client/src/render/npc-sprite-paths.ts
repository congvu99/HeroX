/**
 * Hình NPC trên map theo `dialogId` (đường dẫn tính từ `assets/`); cánh cửa, bàn thờ nhà nguyện cũng là
 * "NPC" vì có hội thoại. Module thuần, không import Phaser để test đọc được.
 */
export const NPC_SPRITE_PATHS: Readonly<Record<string, string>> = {
  keeper: 'sprites/npc/keeper.png',
  smith: 'sprites/npc/smith.png',
  'hollow-villager': 'sprites/npc/villager.png',
  'chapel-door': 'sprites/props/chapel-door.png',
  'chapel-altar': 'sprites/props/altar.png',
  scarecrow: 'sprites/monsters/scarecrow-demon.png',
  // dialogId trên map khác id speaker (forest-warden) nên trỏ thẳng ảnh của speaker.
  'ash-warden': 'sprites/npc/forest-warden.png',
  'crypt-warden': 'sprites/npc/crypt-warden.png',
  // Ảnh bán thân của chained-soul, gate-seraph vẫn là chân dung hộp thoại; bản đồ dùng dáng toàn thân.
  'chained-soul': 'sprites/npc/chained-soul-figure.png',
  'gate-seraph': 'sprites/npc/gate-seraph-figure.png',
  'ash-stag': 'sprites/monsters/ash-stag.png',
  'nameless-bishop': 'sprites/monsters/nameless-bishop.png',
  'antonym-demon': 'sprites/monsters/antonym-demon.png',
  'fallen-angel': 'sprites/monsters/fallen-angel.png',
};
