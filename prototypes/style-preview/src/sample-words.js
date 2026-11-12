/**
 * Dữ liệu MẪU cho bản xem phong cách. Bản thật đọc từ tiến độ học LingoBrain (chỉ từ đã học).
 * pos quyết định loại chiêu: verb → chém, noun → khiên, adj → ban phước, adv → lướt.
 */
export const SAMPLE_HERO = { name: 'Hiệp sĩ Thánh Ngôn', level: 7, learned: 142, mastered: 38 };

export const SAMPLE_WORDS = [
  { word: 'strike', pos: 'verb', vi: 'đánh, tấn công', emoji: '⚔️', ipa: '/straɪk/' },
  { word: 'burn', pos: 'verb', vi: 'đốt cháy', emoji: '🔥', ipa: '/bɜːn/' },
  { word: 'break', pos: 'verb', vi: 'phá vỡ', emoji: '💥', ipa: '/breɪk/' },
  { word: 'pray', pos: 'verb', vi: 'cầu nguyện', emoji: '🙏', ipa: '/preɪ/' },
  { word: 'shield', pos: 'noun', vi: 'cái khiên', emoji: '🛡️', ipa: '/ʃiːld/' },
  { word: 'light', pos: 'noun', vi: 'ánh sáng', emoji: '💡', ipa: '/laɪt/' },
  { word: 'door', pos: 'noun', vi: 'cánh cửa', emoji: '🚪', ipa: '/dɔː/' },
  { word: 'bell', pos: 'noun', vi: 'cái chuông', emoji: '🔔', ipa: '/bel/' },
  { word: 'brave', pos: 'adj', vi: 'dũng cảm', emoji: '🦁', ipa: '/breɪv/' },
  { word: 'holy', pos: 'adj', vi: 'thiêng liêng', emoji: '✨', ipa: '/ˈhəʊli/' },
  { word: 'strong', pos: 'adj', vi: 'mạnh mẽ', emoji: '💪', ipa: '/strɒŋ/' },
  { word: 'quickly', pos: 'adv', vi: 'một cách nhanh chóng', emoji: '⚡', ipa: '/ˈkwɪkli/' },
  { word: 'away', pos: 'adv', vi: 'đi xa, rời khỏi', emoji: '🏃', ipa: '/əˈweɪ/' },
  { word: 'forward', pos: 'adv', vi: 'về phía trước', emoji: '➡️', ipa: '/ˈfɔːwəd/' },
];

/** Nhãn từ loại và chiêu tương ứng, dùng chung cho bảng thiết kế và màn trận. */
export const POS_SKILLS = {
  verb: { label: 'đgt', skill: 'Chém Thánh', effect: 'Lao tới chém, sát thương đầy đủ' },
  noun: { label: 'dt', skill: 'Khiên Thánh Ngôn', effect: 'Dựng khiên chặn đòn kế tiếp, gây sát thương nhẹ' },
  adj: { label: 'tt', skill: 'Ban Phước', effect: 'Đòn kế tiếp mạnh ×1.5' },
  adv: { label: 'trt', skill: 'Lướt Ảnh', effect: 'Dịch chuyển ra sau lưng quỷ, đâm một nhát' },
};
