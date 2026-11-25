/**
 * Nhóm xếp một từ đã học theo dữ liệu SRS LingoBrain + lịch sử gặp từ trong HeroX,
 * dùng để chia hạn ngạch bộ từ mỗi trận (xem `WORD_MIX_QUOTAS` ở word-pool.ts).
 * - new: từ còn non (đang học hoặc mới ôn vài lần).
 * - due: đã tới hạn ôn lại.
 * - hard: hay sai (hệ số dễ thấp, lượt chấm cuối kém, hoặc gõ sai trong HeroX).
 * - familiar: đã quen nhưng chưa tới mốc thuộc.
 * - mastered: đã thuộc (khoảng cách ôn ≥ 21 ngày).
 */
export const WORD_TIERS = ['new', 'due', 'hard', 'familiar', 'mastered'] as const;

export type WordTier = (typeof WORD_TIERS)[number];
