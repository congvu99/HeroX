import { FIELD_ENCOUNTER_ID, FIELD_ROAM_ENCOUNTER_ID, SCARECROW_BOSS_ENCOUNTER_ID, SMITHY_ENCOUNTER_ID, TUTORIAL_ENCOUNTER_ID } from '../../combat/encounters.js';
import type { StoryChapter } from '../../story/story-types.js';

/** Id mốc chương 1; trùng cột `herox.story_progress.beat`, không đổi id đã phát hành. */
export const CHAPTER_1_BEATS = {
  awaken: 'awaken',
  gateImps: 'gate-imps',
  villageArrival: 'village-arrival',
  fieldCleared: 'field-cleared',
  chapelDoor: 'chapel-door',
  fragment1: 'fragment-1',
  fragment2: 'fragment-2',
  fragment3: 'fragment-3',
  chapelRestored: 'chapel-restored',
  smithRescued: 'smith-rescued',
  scarecrowDefeated: 'scarecrow-defeated',
  epilogue: 'epilogue',
} as const;

const B = CHAPTER_1_BEATS;
const FRAGMENTS = [B.fragment1, B.fragment2, B.fragment3] as const;
const VILLAGE_QUESTS_DONE = [B.fieldCleared, B.chapelRestored, B.smithRescued] as const;

/**
 * Chương 1, Làng Sương Sớm bị chiếm. Lexhold → cổng nam (trận hướng dẫn) → cánh đồng → làng:
 * ba việc (quét quỷ cánh đồng, tìm 3 mảnh Thánh Ngôn, cứu thợ rèn) làm theo thứ tự nào cũng được,
 * xong cả ba thì hang Quỷ Bù Nhìn mở; hạ trùm thì chuông ngân lại, Lexhold lên cấp 1.
 */
export const CHAPTER_1_STORY: StoryChapter = {
  chapter: 1,
  title: 'Làng Sương Sớm',
  finalBeat: B.epilogue,
  beats: [
    { id: B.awaken, chapter: 1, objective: 'Nói chuyện với Tu sĩ Giữ Thư', requires: [], completion: { kind: 'dialog' }, autoDialogId: 'keeper' },
    {
      id: B.gateImps,
      chapter: 1,
      objective: 'Đẩy lùi lũ tiểu quỷ ở cổng nam',
      requires: [B.awaken],
      completion: { kind: 'battle', encounterId: TUTORIAL_ENCOUNTER_ID },
    },
    {
      id: B.villageArrival,
      chapter: 1,
      objective: 'Băng qua cánh đồng tới Làng Sương Sớm, hỏi chuyện dân làng',
      requires: [B.gateImps],
      completion: { kind: 'dialog' },
    },
    {
      id: B.fieldCleared,
      chapter: 1,
      objective: 'Quét lũ quỷ giữa cánh đồng',
      requires: [B.villageArrival],
      completion: { kind: 'battle', encounterId: FIELD_ENCOUNTER_ID },
    },
    {
      id: B.chapelDoor,
      chapter: 1,
      objective: 'Trả lại chữ cho cánh cửa nhà nguyện',
      requires: [B.villageArrival],
      completion: { kind: 'word', word: 'door', meaning: 'cánh cửa', emoji: '🚪' },
    },
    ...FRAGMENTS.map((id, index) => ({
      id,
      chapter: 1,
      objective: 'Tìm 3 mảnh Thánh Ngôn trong nhà nguyện',
      requires: [B.chapelDoor],
      completion: { kind: 'collect' as const, itemId: `holy-fragment-${index + 1}` },
    })),
    {
      id: B.chapelRestored,
      chapter: 1,
      objective: 'Đặt các mảnh Thánh Ngôn lên bàn thờ',
      requires: [...FRAGMENTS],
      completion: { kind: 'dialog' },
    },
    {
      id: B.smithRescued,
      chapter: 1,
      objective: 'Cứu thợ rèn khỏi lũ quỷ đói',
      requires: [B.villageArrival],
      completion: { kind: 'battle', encounterId: SMITHY_ENCOUNTER_ID },
    },
    {
      id: B.scarecrowDefeated,
      chapter: 1,
      objective: 'Vào hang phía bắc, hạ Quỷ Bù Nhìn',
      requires: [...VILLAGE_QUESTS_DONE],
      completion: { kind: 'battle', encounterId: SCARECROW_BOSS_ENCOUNTER_ID },
    },
    {
      id: B.epilogue,
      chapter: 1,
      objective: 'Nghe tiếng chuông nhà thờ',
      requires: [B.scarecrowDefeated],
      completion: { kind: 'dialog' },
      autoDialogId: 'epilogue',
    },
  ],
  quests: [
    { id: 'awakening', title: 'Tỉnh giấc ở Lexhold', beats: [B.awaken, B.gateImps] },
    { id: 'misty-village', title: 'Làng Sương Sớm', beats: [B.villageArrival] },
    { id: 'field', title: 'Cánh đồng sương đỏ', beats: [B.fieldCleared] },
    { id: 'chapel', title: 'Nhà nguyện câm lặng', beats: [B.chapelDoor, ...FRAGMENTS, B.chapelRestored] },
    { id: 'smith', title: 'Lò rèn nguội lạnh', beats: [B.smithRescued] },
    { id: 'scarecrow', title: 'Quỷ Bù Nhìn', beats: [B.scarecrowDefeated, B.epilogue] },
  ],
  encounterGates: [
    { encounterId: TUTORIAL_ENCOUNTER_ID, requires: [B.awaken], lockedMessage: 'Hãy nói chuyện với Tu sĩ Giữ Thư trước.' },
    { encounterId: FIELD_ENCOUNTER_ID, requires: [B.villageArrival], lockedMessage: 'Sương đỏ quá dày. Hãy tới làng hỏi chuyện trước.' },
    { encounterId: FIELD_ROAM_ENCOUNTER_ID, requires: [B.villageArrival], lockedMessage: 'Sương đỏ quá dày. Hãy tới làng hỏi chuyện trước.' },
    { encounterId: SMITHY_ENCOUNTER_ID, requires: [B.villageArrival], lockedMessage: 'Hãy hỏi chuyện dân làng trước.' },
    { encounterId: SCARECROW_BOSS_ENCOUNTER_ID, requires: [...VILLAGE_QUESTS_DONE], lockedMessage: 'Khiên lửa của Quỷ Bù Nhìn quá mạnh. Hãy giúp làng trước.' },
  ],
  levelGates: [
    { levelId: 'Misty_Fields', requires: [B.gateImps], lockedMessage: 'Lũ tiểu quỷ còn chắn cổng nam.' },
    { levelId: 'Misty_Chapel', requires: [B.chapelDoor], lockedMessage: 'Cánh cửa nhà nguyện đã mất chữ, không mở được.' },
    {
      levelId: 'Scarecrow_Lair',
      requires: [...VILLAGE_QUESTS_DONE],
      lockedMessage: 'Sương lửa chặn lối vào hang. Hãy quét cánh đồng, khôi phục nhà nguyện và cứu thợ rèn trước.',
    },
    { levelId: 'Ash_Forest', requires: [B.epilogue], chapter: 2, lockedMessage: 'Cổng xuống Rừng Tro còn đóng.' },
  ],
  buildingUnlocks: { forge: B.smithRescued },
  dialogs: [
    {
      id: 'keeper',
      variants: [
        {
          unless: B.awaken,
          completesBeat: B.awaken,
          lines: [
            { speaker: 'narrator', text: 'Tiền đồn Lexhold. Mưa rơi trên tường đổ. Chuông nhà thờ treo đó mà không ngân nổi một tiếng.' },
            { speaker: 'keeper', text: 'Ngươi tỉnh rồi, hiệp sĩ. Ta là Giữ Thư, kẻ cuối cùng còn trông coi những cuốn sách nơi này.' },
            { speaker: 'keeper', text: 'Thế giới đứng vững nhờ Thánh Ngôn, những chữ thiên đàng ban xuống. Thứ gì có tên thì còn tồn tại.', teach: { word: 'word', meaning: 'chữ, từ' } },
            { speaker: 'keeper', text: 'Từ Vực Câm Lặng, quỷ trồi lên nuốt chữ. Cánh cửa mất tên thì không mở. Con người mất tiếng thì thành vỏ rỗng.' },
            { speaker: 'hero', text: 'Vậy ta phải làm gì?' },
            { speaker: 'keeper', text: 'Mỗi chữ ngươi học được là một chữ thánh hồi sinh. Gõ đúng chữ, phép thánh sẽ giáng xuống kẻ thù.' },
            { speaker: 'keeper', text: 'Nhưng nhớ: chữ không ôn sẽ phai. Đó là cách Vực Câm Lặng chiến thắng.', teach: { word: 'remember', meaning: 'nhớ' } },
            { speaker: 'keeper', text: 'Lũ tiểu quỷ đang cào cổng nam. Ra đó đi. Thấy nghĩa của chữ thì gõ chữ ấy, hoặc chạm vào ô chữ đúng trên vòng từ.' },
            { speaker: 'keeper', text: 'Gõ đúng liên tiếp thật nhanh, phép sẽ nối thành chuỗi và mạnh hơn nhiều.' },
          ],
        },
        {
          unless: B.gateImps,
          lines: [{ speaker: 'keeper', text: 'Cổng nam, hiệp sĩ. Gõ đúng chữ để tung phép, nối chuỗi để phép mạnh hơn.' }],
        },
        {
          requires: [B.epilogue],
          lines: [
            { speaker: 'keeper', text: 'Chuông đã ngân. Lexhold có lại hơi ấm đầu tiên.' },
            { speaker: 'keeper', text: 'Cổng xuống Rừng Tro ở phía đông. Nó chỉ mở cho người đã hồi sinh đủ một trăm chữ.' },
          ],
        },
        {
          lines: [
            { speaker: 'keeper', text: 'Làng Sương Sớm ở phía nam, sau cánh đồng. Dân làng ở đó đã mất tiếng. Hãy giúp họ.' },
            { speaker: 'keeper', text: 'Ở thành trì, hãy ghé Tháp Phép và Thư Viện. Lò rèn thì phải chờ có thợ rèn.' },
          ],
        },
      ],
    },
    {
      id: 'hollow-villager',
      variants: [
        {
          requires: [B.gateImps],
          unless: B.villageArrival,
          completesBeat: B.villageArrival,
          lines: [
            { speaker: 'narrator', text: 'Một người đàn bà đứng bất động giữa đường, mắt trống rỗng. Sương đỏ quấn quanh cổ chân bà.' },
            { speaker: 'villager', text: '…cửa… không… mở…' },
            { speaker: 'hero', text: 'Bà còn nghe được ta không?' },
            { speaker: 'villager', text: 'Chuông… nhà thờ… chữ… bị ăn mất…' },
            { speaker: 'narrator', text: 'Lũ quỷ đã nuốt tiếng nói của cả làng. Cánh đồng đầy quỷ, nhà nguyện khoá chặt, lò rèn tắt lửa.' },
            { speaker: 'hero', text: 'Ta sẽ trả lại chữ cho nơi này.' },
          ],
        },
        {
          requires: [B.scarecrowDefeated],
          lines: [{ speaker: 'villager', text: 'Ta… nói được rồi. Cảm ơn ngài, hiệp sĩ. Chuông lại ngân rồi.', teach: { word: 'thank', meaning: 'cảm ơn' } }],
        },
        { lines: [{ speaker: 'villager', text: '…bù nhìn… phía bắc… lửa…' }] },
      ],
    },
    {
      id: 'chapel-door',
      variants: [
        {
          requires: [B.villageArrival],
          unless: B.chapelDoor,
          completesBeat: B.chapelDoor,
          lines: [
            { speaker: 'narrator', text: 'Cánh cửa nhà nguyện không có then, không có khoá. Nó chỉ quên mất mình là một cánh cửa.' },
            { speaker: 'keeper', text: '(Giọng Giữ Thư vang trong đầu) Gọi đúng tên nó, hiệp sĩ.' },
          ],
        },
        { requires: [B.chapelDoor], lines: [{ speaker: 'narrator', text: 'Cánh cửa nhớ lại tên mình và mở ra cho ngài.' }] },
        { lines: [{ speaker: 'narrator', text: 'Cánh cửa nhà nguyện đóng im lìm. Hãy hỏi chuyện dân làng trước đã.' }] },
      ],
    },
    {
      id: 'chapel-altar',
      variants: [
        {
          requires: [...FRAGMENTS],
          unless: B.chapelRestored,
          completesBeat: B.chapelRestored,
          lines: [
            { speaker: 'narrator', text: 'Ba mảnh Thánh Ngôn ghép lại trên bàn thờ, sáng lên như than hồng.' },
            { speaker: 'keeper', text: '(Giọng Giữ Thư) Ánh sáng đã về nhà nguyện. Nhìn kìa, chữ khắc trên tường hiện ra lại.', teach: { word: 'light', meaning: 'ánh sáng' } },
            { speaker: 'hero', text: 'Còn chuông thì sao?' },
            { speaker: 'keeper', text: 'Chuông bị Quỷ Bù Nhìn giữ tiếng. Hắn ở hang phía bắc làng.' },
          ],
        },
        {
          requires: [B.chapelRestored],
          lines: [{ speaker: 'narrator', text: 'Bàn thờ toả ánh sáng ấm. Sương đỏ không dám bén vào nhà nguyện.' }],
        },
        { lines: [{ speaker: 'narrator', text: 'Bàn thờ có ba hốc trống. Các mảnh Thánh Ngôn hẳn rơi đâu đó trong gian nhà.' }] },
      ],
    },
    {
      id: 'smith',
      variants: [
        {
          requires: [B.villageArrival],
          unless: B.smithRescued,
          startsEncounter: SMITHY_ENCOUNTER_ID,
          lines: [
            { speaker: 'narrator', text: 'Thợ rèn co người sau đe sắt. Lũ quỷ đói vây quanh, gặm dần tên của từng món đồ.' },
            { speaker: 'smith', text: 'Búa… cái búa của ta… nó quên mất nó là búa rồi!', teach: { word: 'hammer', meaning: 'cái búa' } },
            { speaker: 'hero', text: 'Lùi lại. Để chúng cho ta.' },
          ],
        },
        {
          requires: [B.smithRescued],
          lines: [
            { speaker: 'smith', text: 'Ngài cứu mạng ta. Lò rèn ở Lexhold là của ngài, ta sẽ lên đó nhóm lửa.', teach: { word: 'fire', meaning: 'lửa' } },
            { speaker: 'smith', text: 'Mang vàng về, ta rèn cho ngài thanh kiếm xứng với chữ thánh.' },
          ],
        },
        { lines: [{ speaker: 'narrator', text: 'Một người đàn ông co ro sau đe sắt, không đáp lời. Hãy hỏi chuyện dân làng trước đã.' }] },
      ],
    },
    {
      id: 'scarecrow',
      variants: [
        {
          requires: [...VILLAGE_QUESTS_DONE],
          unless: B.scarecrowDefeated,
          startsEncounter: SCARECROW_BOSS_ENCOUNTER_ID,
          lines: [
            { speaker: 'scarecrow', text: 'Kẻ mang chữ… ngươi tới trả lại tiếng chuông sao? Ta đã nuốt nó rồi.' },
            { speaker: 'scarecrow', text: 'Rơm của ta cháy mãi không tàn. Phép lẻ tẻ của ngươi chỉ như mưa bụi.' },
            { speaker: 'keeper', text: '(Giọng Giữ Thư) Khi hắn dựng khiên lửa, đừng đánh lẻ. Gõ đúng liền một mạch ba chữ, chuỗi phép sẽ xuyên khiên.', teach: { word: 'shield', meaning: 'khiên' } },
          ],
        },
        { requires: [B.scarecrowDefeated], lines: [{ speaker: 'narrator', text: 'Chỉ còn đống tro và một cây gậy cháy đen.' }] },
      ],
    },
    {
      id: 'epilogue',
      variants: [
        {
          requires: [B.scarecrowDefeated],
          unless: B.epilogue,
          completesBeat: B.epilogue,
          lines: [
            { speaker: 'narrator', text: 'Quỷ Bù Nhìn tan thành tro. Một tiếng ngân trầm vang lên từ tháp chuông.', teach: { word: 'bell', meaning: 'cái chuông' } },
            { speaker: 'villager', text: 'Ta… ta nói được rồi! Cả làng nói được rồi!' },
            { speaker: 'keeper', text: 'Ngươi nghe chứ, hiệp sĩ? Lexhold vừa có lại tiếng chuông đầu tiên. Tiền đồn đã lên cấp 1.' },
            { speaker: 'keeper', text: 'Nhưng Vực Câm Lặng còn sâu lắm. Cổng xuống Rừng Tro sẽ mở khi ngươi hồi sinh đủ một trăm chữ.' },
            { speaker: 'narrator', text: 'Hết chương 1: Làng Sương Sớm.' },
          ],
        },
      ],
    },
  ],
};
