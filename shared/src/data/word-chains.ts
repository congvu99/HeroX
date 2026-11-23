/** Cụm từ ghép chuỗi: tung đúng lần lượt các từ trong cửa sổ combo → đòn kết liễu. */
export interface WordChain {
  readonly id: string;
  /** Từ theo thứ tự tung, viết thường, khớp cột `word` của bộ từ LingoBrain. */
  readonly words: readonly string[];
}

// Biên tập tay cho chương 1 từ các từ phổ biến có trong bộ từ LingoBrain (kiểm bằng test hợp đồng ở server).
// Mỗi chuỗi đọc thành một cụm có nghĩa, hợp chủ đề hiệp sĩ đánh quỷ.
const CHAPTER_1_PHRASES: readonly string[] = [
  'run away quickly',
  'fight back hard',
  'strike fast again',
  'break down wall',
  'climb up high',
  'walk slowly home',
  'look around carefully',
  'stand still now',
  'move forward together',
  'go out now',
  'come back soon',
  'turn around quickly',
  'follow path ahead',
  'swim across river',
  'fire burn bright',
  'help friend escape',
  'hide behind tree',
  'open castle gate',
  'close door quietly',
  'throw stone far',
  'wake up early',
  'fall down hard',
  'ring alarm bell',
  'always speak truth',
  'heal deep wound',
  'defend city together',
  'hunt evil spirit',
  'finally win battle',
  'destroy dark magic',
  'jump over wall',
];

// Chuỗi theo chủ đề từng chương (mọi từ đều có trong bộ từ LingoBrain, kiểm bằng test hợp đồng ở server).
// Chương 2 Rừng Tro: thiên nhiên + động từ di chuyển.
const CHAPTER_2_PHRASES: readonly string[] = [
  'run through forest',
  'leap over stone',
  'climb tall tree',
  'chase fast wind',
  'swim cold river',
  'move forward again',
  'hunt dark spirit',
  'escape heavy smoke',
];
// Chương 3 Hầm Mộ Thánh: đồ vật + nơi chốn.
const CHAPTER_3_PHRASES: readonly string[] = [
  'open stone gate',
  'hold iron cross',
  'light dark tunnel',
  'call old name',
  'guard ancient bone',
  'break cold stone',
  'walk deep cave',
];
// Chương 4 Vực Lửa: công việc + cảm xúc.
const CHAPTER_4_PHRASES: readonly string[] = [
  'burn bright fire',
  'build strong wall',
  'dig deep hole',
  'fear dark magic',
  'hope for light',
  'hold back fear',
  'work hard again',
];
// Chương 5 Thiên Cung Vỡ: tổng hợp.
const CHAPTER_5_PHRASES: readonly string[] = [
  'rise into light',
  'fall from sky',
  'remember every word',
  'learn true name',
  'heal broken soul',
  'forget old fear',
  'bless brave hero',
  'fight silent dark',
];

const ALL_PHRASES: readonly string[] = [
  ...CHAPTER_1_PHRASES,
  ...CHAPTER_2_PHRASES,
  ...CHAPTER_3_PHRASES,
  ...CHAPTER_4_PHRASES,
  ...CHAPTER_5_PHRASES,
];

export const WORD_CHAINS: readonly WordChain[] = ALL_PHRASES.map((phrase) => ({
  id: phrase.replace(/ /g, '-'),
  words: phrase.split(' '),
}));
