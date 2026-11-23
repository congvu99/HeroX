import { CH2_BOSS_ENCOUNTER_ID, CH2_FIELD_ENCOUNTER_ID } from '../../combat/encounters.js';
import type { StoryChapter } from '../../story/story-types.js';

/** Id mốc chương 2; trùng cột `herox.story_progress.beat`, không đổi id đã phát hành. */
export const CHAPTER_2_BEATS = {
  arrival: 'ash-arrival',
  pathCleared: 'ash-path-cleared',
  windWord: 'ash-wind-word',
  stagDefeated: 'ash-stag-defeated',
  epilogue: 'ash-epilogue',
} as const;

const B = CHAPTER_2_BEATS;

/**
 * Chương 2, Rừng Tro. Hiệp sĩ xuống cổng đông, băng rừng cháy dở: quét lối mòn (trận cánh rừng),
 * gọi lại tên cơn gió để mở lối sâu, rồi hạ Hươu Quỷ Tro ở trảng thiêng. Chủ đề từ: thiên nhiên,
 * động từ di chuyển (lướt, vượt địa hình). Xong mốc cuối thì cổng xuống Hầm Mộ Thánh (chương 3) mở.
 */
export const CHAPTER_2_STORY: StoryChapter = {
  chapter: 2,
  title: 'Rừng Tro',
  finalBeat: B.epilogue,
  beats: [
    {
      id: B.arrival,
      chapter: 2,
      objective: 'Tới cửa Rừng Tro, nghe Người Giữ Rừng',
      requires: [],
      completion: { kind: 'dialog' },
      autoDialogId: 'ash-warden',
    },
    {
      id: B.pathCleared,
      chapter: 2,
      objective: 'Quét lũ Sói Tro chắn lối mòn',
      requires: [B.arrival],
      completion: { kind: 'battle', encounterId: CH2_FIELD_ENCOUNTER_ID },
    },
    {
      id: B.windWord,
      chapter: 2,
      objective: 'Gọi lại tên cơn gió để mở lối sâu vào rừng',
      requires: [B.pathCleared],
      completion: { kind: 'word', word: 'wind', meaning: 'cơn gió', emoji: '🌬️' },
    },
    {
      id: B.stagDefeated,
      chapter: 2,
      objective: 'Vào trảng thiêng, hạ Hươu Quỷ Tro',
      requires: [B.windWord],
      completion: { kind: 'battle', encounterId: CH2_BOSS_ENCOUNTER_ID },
    },
    {
      id: B.epilogue,
      chapter: 2,
      objective: 'Nghe rừng thở lại',
      requires: [B.stagDefeated],
      completion: { kind: 'dialog' },
      autoDialogId: 'ash-epilogue',
    },
  ],
  quests: [
    { id: 'ash-forest', title: 'Rừng Tro', beats: [B.arrival, B.pathCleared, B.windWord] },
    { id: 'ash-stag', title: 'Hươu Quỷ Tro', beats: [B.stagDefeated, B.epilogue] },
  ],
  encounterGates: [
    { encounterId: CH2_FIELD_ENCOUNTER_ID, requires: [B.arrival], lockedMessage: 'Tro bụi còn dày. Hãy nghe Người Giữ Rừng trước.' },
    { encounterId: CH2_BOSS_ENCOUNTER_ID, requires: [B.windWord], lockedMessage: 'Lối vào trảng thiêng còn kín. Hãy mở gió trước.' },
  ],
  // Cổng vào Rừng Tro (Ash_Forest) do chương 1 giữ. Ở đây chỉ gác lối trong chương và cổng xuống chương 3.
  levelGates: [
    { levelId: 'Ash_Stag_Grove', requires: [B.windWord], lockedMessage: 'Lối vào trảng thiêng còn kín. Hãy mở gió trước.' },
    { levelId: 'Saint_Catacomb', requires: [B.epilogue], chapter: 3, lockedMessage: 'Cổng xuống Hầm Mộ Thánh còn đóng.' },
  ],
  buildingUnlocks: {},
  dialogs: [
    {
      id: 'ash-warden',
      variants: [
        {
          unless: B.arrival,
          completesBeat: B.arrival,
          lines: [
            { speaker: 'narrator', text: 'Rừng Tro: thân cây cháy dở còn đứng, tro bay như tuyết đen. Dưới tro, rễ cây vẫn còn thở.' },
            { speaker: 'forest-warden', text: 'Hiệp sĩ mang chữ. Ta là Người Giữ Rừng, hay phần còn lại của ông ta.' },
            { speaker: 'forest-warden', text: 'Quỷ đã nuốt tên của cây, của gió, của suối. Rừng quên mất mình là rừng nên cứ cháy mãi.', teach: { word: 'forest', meaning: 'khu rừng' } },
            { speaker: 'hero', text: 'Ta trả lại tên cho nó được chứ?' },
            { speaker: 'forest-warden', text: 'Được. Nhưng Hươu Quỷ Tro canh trảng thiêng. Muốn tới đó, hãy học cách lướt qua địa hình, và gọi lại cơn gió.', teach: { word: 'move', meaning: 'di chuyển' } },
          ],
        },
        {
          requires: [B.epilogue],
          lines: [{ speaker: 'forest-warden', text: 'Rừng đã thở lại. Cổng xuống Hầm Mộ Thánh ở phía bắc, mở cho người đã hồi sinh đủ ba trăm chữ.' }],
        },
        { lines: [{ speaker: 'forest-warden', text: 'Lướt qua gốc cháy, gọi lại gió, rồi mới vào được trảng thiêng.' }] },
      ],
    },
    {
      id: 'ash-wind',
      variants: [
        {
          requires: [B.pathCleared],
          unless: B.windWord,
          completesBeat: B.windWord,
          lines: [
            { speaker: 'narrator', text: 'Một khe đá hẹp đứng im, không một hơi thở. Cơn gió ở đây đã quên mất tên mình.' },
            { speaker: 'forest-warden', text: '(Giọng vọng trong tro) Gọi tên nó, hiệp sĩ. Gió trở lại thì lối sâu sẽ mở.' },
          ],
        },
        { requires: [B.windWord], lines: [{ speaker: 'narrator', text: 'Gió trở lại, cuốn tro dạt sang hai bên, để lộ lối vào trảng thiêng.' }] },
        { lines: [{ speaker: 'narrator', text: 'Khe đá lặng như tờ. Hãy quét sạch lối mòn trước đã.' }] },
      ],
    },
    {
      id: 'ash-stag',
      variants: [
        {
          requires: [B.windWord],
          unless: B.stagDefeated,
          startsEncounter: CH2_BOSS_ENCOUNTER_ID,
          lines: [
            { speaker: 'ash-stag', text: 'Kẻ mang chữ… ngươi tới trả tên cho rừng? Rừng này là của tro, và tro là của ta.' },
            { speaker: 'ash-stag', text: 'Gạc của ta cháy không tàn. Phép lẻ của ngươi chỉ như mưa bụi.' },
            { speaker: 'forest-warden', text: '(Giọng Người Giữ Rừng) Khi nó dựng khiên tro, đừng đánh lẻ. Nối liền ba chữ, chuỗi phép sẽ xuyên khiên.', teach: { word: 'burn', meaning: 'cháy, đốt' } },
          ],
        },
        { requires: [B.stagDefeated], lines: [{ speaker: 'narrator', text: 'Hươu Quỷ Tro đổ xuống, gạc tàn thành tro trắng. Trảng thiêng lặng đi, rồi xanh lại từng vệt.' }] },
      ],
    },
    {
      id: 'ash-epilogue',
      variants: [
        {
          requires: [B.stagDefeated],
          unless: B.epilogue,
          completesBeat: B.epilogue,
          lines: [
            { speaker: 'narrator', text: 'Tro ngừng rơi. Lần đầu sau rất lâu, Rừng Tro hít vào một hơi gió sạch.', teach: { word: 'tree', meaning: 'cái cây' } },
            { speaker: 'forest-warden', text: 'Ngươi nghe chứ? Lá non đang nhú. Rừng nhớ ra mình là rừng rồi.' },
            { speaker: 'forest-warden', text: 'Nhưng Vực Câm Lặng còn sâu. Phía bắc là Hầm Mộ Thánh, nơi kẻ chết quên cả tên mình. Cổng mở khi ngươi đủ ba trăm chữ.' },
            { speaker: 'narrator', text: 'Hết chương 2: Rừng Tro.' },
          ],
        },
      ],
    },
  ],
};
