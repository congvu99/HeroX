import { CH5_BOSS_ENCOUNTER_ID, CH5_FIELD_ENCOUNTER_ID } from '../../combat/encounters.js';
import type { StoryChapter } from '../../story/story-types.js';

/** Id mốc chương 5; trùng cột `herox.story_progress.beat`, không đổi id đã phát hành. */
export const CHAPTER_5_BEATS = {
  arrival: 'heaven-arrival',
  hallCleared: 'heaven-hall-cleared',
  lightWord: 'heaven-light-word',
  angelDefeated: 'heaven-angel-defeated',
  epilogue: 'heaven-epilogue',
} as const;

const B = CHAPTER_5_BEATS;

/**
 * Chương 5, Thiên Cung Vỡ. Hiệp sĩ lên thiên cung đổ nát: dẹp tiểu thiên thần câm và seraph gãy cánh,
 * gọi lại tên ánh sáng để mở cửa nội điện, rồi đối mặt Thiên Thần Sa Ngã Câm Lặng.
 * Cốt truyện: thiên thần sa ngã là hiệp sĩ Thánh Ngôn đời trước, bỏ ôn nên quên hết chữ và rơi xuống Vực Câm Lặng.
 * Chủ đề từ: tổng hợp. Thiết kế: trận cuối chỉ dùng từ đã thuộc (cơ chế engine, không gắn được vào dữ liệu trận).
 */
export const CHAPTER_5_STORY: StoryChapter = {
  chapter: 5,
  title: 'Thiên Cung Vỡ',
  finalBeat: B.epilogue,
  beats: [
    {
      id: B.arrival,
      chapter: 5,
      objective: 'Lên Thiên Cung Vỡ, nghe Seraph Giữ Cổng',
      requires: [],
      completion: { kind: 'dialog' },
      autoDialogId: 'gate-seraph',
    },
    {
      id: B.hallCleared,
      chapter: 5,
      objective: 'Dẹp tiểu thiên thần câm và seraph gãy cánh ở tiền sảnh',
      requires: [B.arrival],
      completion: { kind: 'battle', encounterId: CH5_FIELD_ENCOUNTER_ID },
    },
    {
      id: B.lightWord,
      chapter: 5,
      objective: 'Gọi lại tên ánh sáng để mở cửa nội điện',
      requires: [B.hallCleared],
      completion: { kind: 'word', word: 'light', meaning: 'ánh sáng', emoji: '✨' },
    },
    {
      id: B.angelDefeated,
      chapter: 5,
      objective: 'Vào nội điện, hạ Thiên Thần Sa Ngã (trận cuối chỉ dùng từ đã thuộc)',
      requires: [B.lightWord],
      completion: { kind: 'battle', encounterId: CH5_BOSS_ENCOUNTER_ID },
    },
    {
      id: B.epilogue,
      chapter: 5,
      objective: 'Nghe Thánh Ngôn vang lại',
      requires: [B.angelDefeated],
      completion: { kind: 'dialog' },
      autoDialogId: 'heaven-epilogue',
    },
  ],
  quests: [
    { id: 'broken-heaven', title: 'Thiên Cung Vỡ', beats: [B.arrival, B.hallCleared, B.lightWord] },
    { id: 'fallen-angel', title: 'Thiên Thần Sa Ngã', beats: [B.angelDefeated, B.epilogue] },
  ],
  encounterGates: [
    { encounterId: CH5_FIELD_ENCOUNTER_ID, requires: [B.arrival], lockedMessage: 'Cổng trời còn khép. Hãy nghe Seraph Giữ Cổng trước.' },
    { encounterId: CH5_BOSS_ENCOUNTER_ID, requires: [B.lightWord], lockedMessage: 'Cửa nội điện còn tối. Hãy gọi lại ánh sáng trước.' },
  ],
  // Cổng lên Thiên Cung Vỡ (Broken_Heaven) do chương 4 giữ. Ở đây chỉ gác lối vào nội điện.
  levelGates: [
    { levelId: 'Fallen_Sanctum', requires: [B.lightWord], lockedMessage: 'Cửa nội điện còn tối. Hãy gọi lại ánh sáng trước.' },
  ],
  buildingUnlocks: {},
  dialogs: [
    {
      id: 'gate-seraph',
      variants: [
        {
          unless: B.arrival,
          completesBeat: B.arrival,
          lines: [
            { speaker: 'narrator', text: 'Thiên Cung Vỡ: bậc đá trắng nổi giữa mây, nhiều bậc đã vỡ và rơi vào hư không. Đây là nơi Thánh Ngôn sinh ra.' },
            { speaker: 'gate-seraph', text: 'Hiệp sĩ mang chữ. Ta là Seraph Giữ Cổng, kẻ cuối cùng còn tỉnh trên thiên cung này.' },
            { speaker: 'gate-seraph', text: 'Kẻ trong nội điện từng là người như ngươi: hiệp sĩ Thánh Ngôn đời trước. Hắn thôi ôn chữ, rồi quên dần, rồi ngã.', teach: { word: 'remember', meaning: 'ghi nhớ' } },
            { speaker: 'hero', text: 'Hắn quên hết?' },
            { speaker: 'gate-seraph', text: 'Hết. Giờ hắn câm lặng, kéo cả thiên cung xuống Vực Câm Lặng. Chỉ chữ ngươi đã thuộc nằm lòng mới chạm tới hắn.', teach: { word: 'forget', meaning: 'quên' } },
          ],
        },
        {
          requires: [B.epilogue],
          lines: [{ speaker: 'gate-seraph', text: 'Thánh Ngôn vang lại khắp thiên cung. Ngươi đã làm điều hắn không làm được: ngươi ôn, nên ngươi nhớ.' }],
        },
        { lines: [{ speaker: 'gate-seraph', text: 'Dẹp lũ thiên thần câm, gọi lại ánh sáng, rồi vào nội điện. Chỉ chữ đã thuộc mới chạm tới kẻ sa ngã.' }] },
      ],
    },
    {
      id: 'heaven-light',
      variants: [
        {
          requires: [B.hallCleared],
          unless: B.lightWord,
          completesBeat: B.lightWord,
          lines: [
            { speaker: 'narrator', text: 'Cửa nội điện đứng trong bóng tối tuyệt đối. Ánh sáng ở đây đã bị câm, quên mất mình là ánh sáng.' },
            { speaker: 'gate-seraph', text: '(Giọng vọng trên mây) Gọi lại tên nó, hiệp sĩ. Thánh quang trở lại thì cửa sẽ mở.' },
          ],
        },
        { requires: [B.lightWord], lines: [{ speaker: 'narrator', text: 'Thánh quang #fff1c2 bừng lên, rót xuống bậc đá, mở toang cửa nội điện.' }] },
        { lines: [{ speaker: 'narrator', text: 'Cửa nội điện tối đen. Hãy dẹp lũ thiên thần câm ở tiền sảnh trước.' }] },
      ],
    },
    {
      id: 'fallen-angel',
      variants: [
        {
          requires: [B.lightWord],
          unless: B.angelDefeated,
          startsEncounter: CH5_BOSS_ENCOUNTER_ID,
          lines: [
            { speaker: 'fallen-angel', text: '…' },
            { speaker: 'narrator', text: 'Thiên thần không nói. Môi hắn mấp máy những chữ hắn đã quên, không thành tiếng.' },
            { speaker: 'fallen-angel', text: '(Trong đầu ngươi) …ta… từng… như ngươi… rồi ta thôi ôn… và chữ bỏ ta đi…' },
            { speaker: 'gate-seraph', text: '(Giọng Seraph Giữ Cổng) Chỉ chữ ngươi thuộc nằm lòng mới xuyên khiên câm lặng. Nối ba chữ đã thuộc một mạch.', teach: { word: 'word', meaning: 'chữ, lời' } },
          ],
        },
        { requires: [B.angelDefeated], lines: [{ speaker: 'narrator', text: 'Thiên thần quỳ xuống, lần cuối nhớ ra một chữ, và mỉm cười trước khi tan vào ánh sáng.' }] },
      ],
    },
    {
      id: 'heaven-epilogue',
      variants: [
        {
          requires: [B.angelDefeated],
          unless: B.epilogue,
          completesBeat: B.epilogue,
          lines: [
            { speaker: 'narrator', text: 'Bậc đá vỡ ghép lại dưới chân ngươi. Thánh Ngôn vang lên từ mọi phía, như chuông, như lời nguyện.', teach: { word: 'light', meaning: 'ánh sáng' } },
            { speaker: 'gate-seraph', text: 'Kẻ sa ngã đã yên. Ngươi nhớ điều hắn quên: chữ sống nhờ được ôn lại mỗi ngày.' },
            { speaker: 'gate-seraph', text: 'Vực Câm Lặng lùi xa. Thế giới có lại tên của nó. Nhưng chữ sẽ lại phai nếu ngươi ngừng ôn, hiệp sĩ. Hãy nhớ.' },
            { speaker: 'narrator', text: 'Hết chương 5: Thiên Cung Vỡ. Hành trình khép lại nơi Thánh Ngôn bắt đầu.' },
          ],
        },
      ],
    },
  ],
};
