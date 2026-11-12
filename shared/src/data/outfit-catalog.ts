/**
 * Ngoại trang chỉ đổi hình, không đổi chỉ số. Catalog chỉ giữ id biến thể và mốc mở;
 * hình của từng biến thể do client ánh xạ theo id (xem `docs/art-direction.md`), không gắn với tên file asset.
 */
export interface OutfitVariant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredLearned: number;
  readonly requiredMastered: number;
}

/** Trùng giá trị mặc định cột `herox.heroes.outfit`. */
export const DEFAULT_OUTFIT_ID = 'default';

export const OUTFIT_CATALOG: readonly OutfitVariant[] = [
  {
    id: DEFAULT_OUTFIT_ID,
    name: 'Hiệp Sĩ Thánh Ngôn',
    description: 'Áo khoác trắng thập tự đỏ, áo choàng đỏ, khiên thập tự lớn.',
    requiredLearned: 0,
    requiredMastered: 0,
  },
  {
    id: 'ashen-pilgrim',
    name: 'Kẻ Hành Hương Tro Tàn',
    description: 'Áo choàng xám tro, khiên sơn lại màu than.',
    requiredLearned: 50,
    requiredMastered: 0,
  },
  {
    id: 'crimson-crest',
    name: 'Huy Hiệu Huyết Thánh',
    description: 'Khiên đỏ thẫm khắc vòng huyết, áo choàng viền vàng.',
    requiredLearned: 150,
    requiredMastered: 0,
  },
  {
    id: 'gilded-helm',
    name: 'Mũ Kim Thánh',
    description: 'Mũ kín mạ vàng, giáp vai khắc chữ cổ.',
    requiredLearned: 300,
    requiredMastered: 50,
  },
  {
    id: 'seraph-white',
    name: 'Bạch Thiên Sứ',
    description: 'Giáp trắng bạc ánh thánh quang, áo choàng như đôi cánh gấp.',
    requiredLearned: 600,
    requiredMastered: 200,
  },
];

export function findOutfit(outfitId: string): OutfitVariant | undefined {
  return OUTFIT_CATALOG.find((outfit) => outfit.id === outfitId);
}
