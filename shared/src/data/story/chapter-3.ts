import { CH3_BOSS_ENCOUNTER_ID, CH3_FIELD_ENCOUNTER_ID } from '../../combat/encounters.js';
import type { StoryChapter } from '../../story/story-types.js';

/** Id mốc chương 3; trùng cột `herox.story_progress.beat`, không đổi id đã phát hành. */
export const CHAPTER_3_BEATS = {
  arrival: 'crypt-arrival',
  hallCleared: 'crypt-hall-cleared',
  tombWord: 'crypt-tomb-word',
  bishopDefeated: 'crypt-bishop-defeated',
  epilogue: 'crypt-epilogue',
} as const;

const B = CHAPTER_3_BEATS;

/**
 * Chương 3, Hầm Mộ Thánh. Hiệp sĩ xuống hầm mộ của dòng tu đã ngã: dẹp giáo sĩ áo đỏ và xương kỵ sĩ,
 * gọi lại tên gian mộ để mở lối tới hậu đường, rồi hạ Giám Mục Mất Tên (undead). Chủ đề từ: đồ vật, nơi chốn.
 * Xong mốc cuối thì cổng xuống Vực Lửa (chương 4) mở.
 */
export const CHAPTER_3_STORY: StoryChapter = {
  chapter: 3,
  title: 'Hầm Mộ Thánh',
  finalBeat: B.epilogue,
  beats: [
    {
      id: B.arrival,
      chapter: 3,
      objective: 'Vào Hầm Mộ Thánh, nghe Người Giữ Mộ',
      requires: [],
      completion: { kind: 'dialog' },
      autoDialogId: 'crypt-warden',
    },
    {
      id: B.hallCleared,
      chapter: 3,
      objective: 'Dẹp giáo sĩ áo đỏ và xương kỵ sĩ trong gian giữa',
      requires: [B.arrival],
      completion: { kind: 'battle', encounterId: CH3_FIELD_ENCOUNTER_ID },
    },
    {
      id: B.tombWord,
      chapter: 3,
      objective: 'Gọi lại tên gian mộ để mở lối tới hậu đường',
      requires: [B.hallCleared],
      completion: { kind: 'word', word: 'stone', meaning: 'phiến đá', emoji: '🪨' },
    },
    {
      id: B.bishopDefeated,
      chapter: 3,
      objective: 'Vào hậu đường, hạ Giám Mục Mất Tên',
      requires: [B.tombWord],
      completion: { kind: 'battle', encounterId: CH3_BOSS_ENCOUNTER_ID },
    },
    {
      id: B.epilogue,
      chapter: 3,
      objective: 'Nghe kẻ chết yên nghỉ',
      requires: [B.bishopDefeated],
      completion: { kind: 'dialog' },
      autoDialogId: 'crypt-epilogue',
    },
  ],
  quests: [
    { id: 'saint-catacomb', title: 'Hầm Mộ Thánh', beats: [B.arrival, B.hallCleared, B.tombWord] },
    { id: 'nameless-bishop', title: 'Giám Mục Mất Tên', beats: [B.bishopDefeated, B.epilogue] },
  ],
  encounterGates: [
    { encounterId: CH3_FIELD_ENCOUNTER_ID, requires: [B.arrival], lockedMessage: 'Cửa hầm còn niêm. Hãy nghe Người Giữ Mộ trước.' },
    { encounterId: CH3_BOSS_ENCOUNTER_ID, requires: [B.tombWord], lockedMessage: 'Hậu đường còn khoá. Hãy gọi lại tên gian mộ trước.' },
  ],
  // Cổng vào Hầm Mộ Thánh (Saint_Catacomb) do chương 2 giữ. Ở đây chỉ gác lối trong chương và cổng xuống chương 4.
  levelGates: [
    { levelId: 'Bishop_Sanctum', requires: [B.tombWord], lockedMessage: 'Hậu đường còn khoá. Hãy gọi lại tên gian mộ trước.' },
    { levelId: 'Hellmaw', requires: [B.epilogue], chapter: 4, lockedMessage: 'Cổng xuống Vực Lửa còn đóng.' },
  ],
  buildingUnlocks: {},
  dialogs: [
    {
      id: 'crypt-warden',
      variants: [
        {
          unless: B.arrival,
          completesBeat: B.arrival,
          lines: [
            { speaker: 'narrator', text: 'Hầm Mộ Thánh: hàng cột đá chìm trong bóng tối, nến tắt từ lâu. Tên khắc trên mộ đã bị cạo nhẵn.' },
            { speaker: 'crypt-warden', text: 'Hiệp sĩ. Ta canh nơi này đã trăm năm. Giờ ngay ta cũng sắp quên tên mình.' },
            { speaker: 'crypt-warden', text: 'Khi mộ mất tên, kẻ nằm trong không yên nghỉ được. Chúng dậy, đi tìm tên đã mất.', teach: { word: 'bone', meaning: 'khúc xương' } },
            { speaker: 'hero', text: 'Còn Giám Mục?' },
            { speaker: 'crypt-warden', text: 'Hắn là kẻ cạo tên trên mọi phiến mộ, kể cả tên hắn. Gọi lại tên đồ vật, tên nơi chốn, lối tới hắn sẽ mở.', teach: { word: 'stone', meaning: 'phiến đá' } },
          ],
        },
        {
          requires: [B.epilogue],
          lines: [{ speaker: 'crypt-warden', text: 'Kẻ chết đã yên. Cổng xuống Vực Lửa ở dưới sâu, mở cho người đủ sáu trăm chữ.' }],
        },
        { lines: [{ speaker: 'crypt-warden', text: 'Dẹp lũ xương trong gian giữa, gọi lại tên gian mộ, rồi hậu đường mới mở.' }] },
      ],
    },
    {
      id: 'crypt-tomb',
      variants: [
        {
          requires: [B.hallCleared],
          unless: B.tombWord,
          completesBeat: B.tombWord,
          lines: [
            { speaker: 'narrator', text: 'Một phiến mộ trơ trọi chắn lối xuống hậu đường, mặt đá nhẵn thín, không còn một chữ.' },
            { speaker: 'crypt-warden', text: '(Giọng vọng trong hầm) Trả lại cho nó cái tên đầu tiên, hiệp sĩ. Nó chỉ là một phiến đá.' },
          ],
        },
        { requires: [B.tombWord], lines: [{ speaker: 'narrator', text: 'Phiến mộ nhớ ra mình là đá, trượt sang bên, mở lối tối dẫn xuống hậu đường.' }] },
        { lines: [{ speaker: 'narrator', text: 'Phiến mộ đứng im. Hãy dẹp lũ xương trong gian giữa trước.' }] },
      ],
    },
    {
      id: 'nameless-bishop',
      variants: [
        {
          requires: [B.tombWord],
          unless: B.bishopDefeated,
          startsEncounter: CH3_BOSS_ENCOUNTER_ID,
          lines: [
            { speaker: 'nameless-bishop', text: 'Kẻ mang chữ… ta đã cạo tên khỏi mọi phiến mộ. Không tên thì không chết, hiểu chứ?' },
            { speaker: 'nameless-bishop', text: 'Vòng huyết của ta che chở ta. Chữ của ngươi không chạm tới được.' },
            { speaker: 'crypt-warden', text: '(Giọng Người Giữ Mộ) Khi hắn dựng khiên huyết, gọi liền ba chữ một mạch. Chuỗi phép sẽ xuyên qua.', teach: { word: 'cross', meaning: 'thánh giá' } },
          ],
        },
        { requires: [B.bishopDefeated], lines: [{ speaker: 'narrator', text: 'Giám Mục đổ xuống, lư hương lăn khỏi tay. Trên mộ hắn, một cái tên mờ hiện lại rồi tắt.' }] },
      ],
    },
    {
      id: 'crypt-epilogue',
      variants: [
        {
          requires: [B.bishopDefeated],
          unless: B.epilogue,
          completesBeat: B.epilogue,
          lines: [
            { speaker: 'narrator', text: 'Lũ xương nằm xuống, lần này nằm yên. Tên khắc hiện lại mờ mờ trên từng phiến mộ.', teach: { word: 'name', meaning: 'cái tên' } },
            { speaker: 'crypt-warden', text: 'Ngươi cho kẻ chết lại cái tên. Giờ họ ngủ được rồi. Cả ta nữa.' },
            { speaker: 'crypt-warden', text: 'Dưới hầm mộ là Vực Lửa, địa ngục nuốt cả lời nguyện. Cổng mở khi ngươi đủ sáu trăm chữ.' },
            { speaker: 'narrator', text: 'Hết chương 3: Hầm Mộ Thánh.' },
          ],
        },
      ],
    },
  ],
};
