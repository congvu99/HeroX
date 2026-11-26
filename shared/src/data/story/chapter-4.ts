import { CH4_BOSS_ENCOUNTER_ID, CH4_FIELD_ENCOUNTER_ID } from '../../combat/encounters.js';
import type { StoryChapter } from '../../story/story-types.js';

/** Id mốc chương 4; trùng cột `herox.story_progress.beat`, không đổi id đã phát hành. */
export const CHAPTER_4_BEATS = {
  arrival: 'hell-arrival',
  bridgeCleared: 'hell-bridge-cleared',
  fireWord: 'hell-fire-word',
  demonDefeated: 'hell-demon-defeated',
  epilogue: 'hell-epilogue',
} as const;

const B = CHAPTER_4_BEATS;

/**
 * Chương 4, Vực Lửa (địa ngục). Hiệp sĩ xuống vực dung nham: băng cầu đá qua lũ quỷ lửa,
 * gọi lại tên ngọn lửa để bắc lại cầu đứt, rồi hạ Chúa Quỷ Ngược Nghĩa (đảo nghĩa chữ, cặp trái nghĩa).
 * Chủ đề từ: công việc, cảm xúc. Xong mốc cuối thì cổng lên Thiên Cung Vỡ (chương 5) mở.
 */
export const CHAPTER_4_STORY: StoryChapter = {
  chapter: 4,
  title: 'Vực Lửa',
  finalBeat: B.epilogue,
  beats: [
    {
      id: B.arrival,
      chapter: 4,
      objective: 'Xuống Vực Lửa, nghe linh hồn bị xích',
      requires: [],
      completion: { kind: 'dialog' },
      autoDialogId: 'chained-soul',
    },
    {
      id: B.bridgeCleared,
      chapter: 4,
      objective: 'Dẹp lũ quỷ lửa giữ cầu đá',
      requires: [B.arrival],
      completion: { kind: 'battle', encounterId: CH4_FIELD_ENCOUNTER_ID },
    },
    {
      id: B.fireWord,
      chapter: 4,
      objective: 'Gọi lại tên ngọn lửa để bắc lại cầu đứt',
      requires: [B.bridgeCleared],
      completion: { kind: 'word', word: 'fire', meaning: 'ngọn lửa', emoji: '🔥' },
    },
    {
      id: B.demonDefeated,
      chapter: 4,
      objective: 'Qua cầu lửa, hạ Chúa Quỷ Ngược Nghĩa',
      requires: [B.fireWord],
      completion: { kind: 'battle', encounterId: CH4_BOSS_ENCOUNTER_ID },
    },
    {
      id: B.epilogue,
      chapter: 4,
      objective: 'Nghe xích đứt',
      requires: [B.demonDefeated],
      completion: { kind: 'dialog' },
      autoDialogId: 'hell-epilogue',
    },
  ],
  quests: [
    { id: 'hellmaw', title: 'Vực Lửa', beats: [B.arrival, B.bridgeCleared, B.fireWord] },
    { id: 'antonym-demon', title: 'Chúa Quỷ Ngược Nghĩa', beats: [B.demonDefeated, B.epilogue] },
  ],
  encounterGates: [
    { encounterId: CH4_FIELD_ENCOUNTER_ID, requires: [B.arrival], lockedMessage: 'Hơi nóng quá dữ. Hãy nghe linh hồn bị xích trước.' },
    { encounterId: CH4_BOSS_ENCOUNTER_ID, requires: [B.fireWord], lockedMessage: 'Cầu lửa còn đứt. Hãy gọi lại ngọn lửa trước.' },
  ],
  // Cổng xuống Vực Lửa (Hellmaw) do chương 3 giữ. Ở đây chỉ gác lối trong chương và cổng lên chương 5.
  levelGates: [
    { levelId: 'Antonym_Throne', requires: [B.fireWord], lockedMessage: 'Cầu lửa còn đứt. Hãy gọi lại ngọn lửa trước.' },
    { levelId: 'Broken_Heaven', requires: [B.epilogue], chapter: 5, lockedMessage: 'Cổng lên Thiên Cung Vỡ còn đóng.' },
  ],
  buildingUnlocks: {},
  dialogs: [
    {
      id: 'chained-soul',
      variants: [
        {
          unless: B.arrival,
          completesBeat: B.arrival,
          lines: [
            { speaker: 'narrator', text: 'Vực Lửa: dung nham chảy thành sông, cầu đá bắc ngang. Trong khói, những linh hồn bị xích vào đá.' },
            { speaker: 'chained-soul', text: 'Hiệp sĩ… ngươi còn nhớ tên mình chứ? Ở đây, ta quên cả tên lẫn việc ta từng làm.' },
            { speaker: 'chained-soul', text: 'Chúa Quỷ Ngược Nghĩa cai trị vực này. Hắn đảo mọi chữ: lửa thành băng, yêu thành ghét, sống thành chết.', teach: { word: 'work', meaning: 'công việc' } },
            { speaker: 'hero', text: 'Làm sao qua hắn?' },
            { speaker: 'chained-soul', text: 'Giữ đúng nghĩa thật của chữ, đừng để hắn đảo. Gọi lại ngọn lửa, cầu đứt sẽ nối. Rồi đối mặt hắn.', teach: { word: 'fear', meaning: 'nỗi sợ' } },
          ],
        },
        {
          requires: [B.epilogue],
          lines: [{ speaker: 'chained-soul', text: 'Xích đứt rồi. Cổng lên Thiên Cung Vỡ ở trên cao, mở cho người đủ một nghìn chữ và thuộc hai trăm.' }],
        },
        { lines: [{ speaker: 'chained-soul', text: 'Giữ nghĩa thật của chữ. Gọi lại lửa, bắc cầu, rồi mới qua được Chúa Quỷ.' }] },
      ],
    },
    {
      id: 'hell-fire',
      variants: [
        {
          requires: [B.bridgeCleared],
          unless: B.fireWord,
          completesBeat: B.fireWord,
          lines: [
            { speaker: 'narrator', text: 'Giữa hai bờ dung nham, cầu đá đứt một nhịp. Ngọn lửa ở đây đã bị đảo thành băng câm.' },
            { speaker: 'chained-soul', text: '(Giọng vọng qua khói) Gọi đúng tên thật của nó, hiệp sĩ. Lửa trở lại thì nhịp cầu sẽ nối.' },
          ],
        },
        { requires: [B.fireWord], lines: [{ speaker: 'narrator', text: 'Ngọn lửa bùng lại đúng nghĩa của nó, đông cứng thành nhịp cầu nối liền hai bờ.' }] },
        { lines: [{ speaker: 'narrator', text: 'Nhịp cầu còn đứt. Hãy dẹp lũ quỷ lửa giữ cầu trước.' }] },
      ],
    },
    {
      id: 'antonym-demon',
      variants: [
        {
          requires: [B.fireWord],
          unless: B.demonDefeated,
          startsEncounter: CH4_BOSS_ENCOUNTER_ID,
          lines: [
            { speaker: 'antonym-demon', text: 'Kẻ mang chữ. Ngươi nói "sống", ta nghe "chết". Ngươi nói "yêu", ta nghe "ghét". Mọi chữ của ngươi đều phản lại ngươi.' },
            { speaker: 'antonym-demon', text: 'Khiên của ta dệt từ nghĩa đảo. Một chữ lẻ chỉ nuôi nó mạnh thêm.' },
            { speaker: 'chained-soul', text: '(Giọng linh hồn) Khi hắn dựng khiên đảo nghĩa, nối liền ba chữ đúng nghĩa một mạch. Chuỗi phép sẽ xuyên qua.', teach: { word: 'hope', meaning: 'hy vọng' } },
          ],
        },
        { requires: [B.demonDefeated], lines: [{ speaker: 'narrator', text: 'Chúa Quỷ tan trong lửa, nghĩa đảo rã ra. Dung nham lặng dần, chữ trở về đúng tên của mình.' }] },
      ],
    },
    {
      id: 'hell-epilogue',
      variants: [
        {
          requires: [B.demonDefeated],
          unless: B.epilogue,
          completesBeat: B.epilogue,
          lines: [
            { speaker: 'narrator', text: 'Xích gãy từng khúc. Các linh hồn đứng dậy, lần đầu gọi đúng tên mình.', teach: { word: 'soul', meaning: 'linh hồn' } },
            { speaker: 'chained-soul', text: 'Ngươi giữ cho chữ đúng nghĩa thật giữa nơi mọi thứ bị đảo. Cảm ơn ngươi, hiệp sĩ.' },
            { speaker: 'chained-soul', text: 'Trên đỉnh Vực Lửa là Thiên Cung Vỡ, nơi một thiên thần đã quên hết chữ. Cổng mở khi ngươi đủ một nghìn chữ và thuộc hai trăm.' },
            { speaker: 'narrator', text: 'Hết chương 4: Vực Lửa.' },
          ],
        },
      ],
    },
  ],
};
