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

export const WORD_CHAINS: readonly WordChain[] = CHAPTER_1_PHRASES.map((phrase) => ({
  id: phrase.replace(/ /g, '-'),
  words: phrase.split(' '),
}));
