import { describe, expect, it } from 'vitest';
import {
  buildCitadelResponse,
  CITADEL_REJECTION_MESSAGES,
  MAX_FORGE_LEVEL,
  RING_LOADOUT_SLOTS,
  type CitadelResponse,
  type CitadelState,
} from '@herox/shared';
import {
  filterWords,
  forgeItemRows,
  forgeUpgradeOption,
  initialLoadoutDraft,
  isSameLoadout,
  loadoutCandidates,
  movementSkillRows,
  outfitRows,
  skillTierRows,
  toggleLoadoutWord,
} from '../src/citadel/citadel-view';
import { devCitadelSeed } from '../src/citadel/dev-citadel-fixture';

function view(state: Partial<CitadelState> = {}, learned?: number): CitadelResponse {
  const seed = devCitadelSeed();
  const stats = learned === undefined ? seed.stats : { ...seed.stats, learned };
  return buildCitadelResponse({ state: { ...seed.state, ...state }, stats, words: seed.words, story: [], today: '2026-11-12' });
}

describe('citadel-view', () => {
  it('nút nâng lò rèn hiện chi phí, thiếu từ thì hiện lý do, tối đa thì ẩn', () => {
    expect(forgeUpgradeOption(view())).toEqual({ label: 'Nâng lò rèn lên cấp 2', cost: '100 vàng', blockedReason: null });
    expect(forgeUpgradeOption(view({}, 10))?.blockedReason).toBe(CITADEL_REJECTION_MESSAGES['not-enough-learned']);
    expect(forgeUpgradeOption(view({ forgeLevel: MAX_FORGE_LEVEL }))).toBeNull();
  });

  it('trang bị: chưa rèn thì nút Rèn, đã có thì nâng hoặc mặc; món vượt cấp lò bị khoá', () => {
    const rows = forgeItemRows(view({ inventory: [{ itemId: 'pilgrim-sword', level: 1, equipped: false }] }));
    const sword = rows.find((row) => row.item.id === 'pilgrim-sword');
    const longsword = rows.find((row) => row.item.id === 'templar-longsword');
    const mail = rows.find((row) => row.item.id === 'pilgrim-mail');
    expect(sword).toMatchObject({ canEquip: true, upgrade: { blockedReason: CITADEL_REJECTION_MESSAGES['forge-level-too-low'] } });
    expect(longsword?.upgrade?.blockedReason).toBe(CITADEL_REJECTION_MESSAGES['forge-level-too-low']);
    expect(mail).toMatchObject({ canEquip: false, owned: null, upgrade: { label: 'Rèn', cost: '40 vàng', blockedReason: null } });
  });

  it('bậc chiêu tốn pha lê; bậc tối đa không còn nút', () => {
    const rows = skillTierRows(view({ skillTiers: { attack: 3, guard: 1, empower: 1, evade: 1 } }));
    expect(rows.find((row) => row.kind === 'attack')?.upgrade).toBeNull();
    expect(rows.find((row) => row.kind === 'guard')?.upgrade).toEqual({ label: 'Lên bậc 2', cost: '8 pha lê', blockedReason: null });
  });

  it('ngoại trang khoá theo mốc từ và đánh dấu bộ đang mặc', () => {
    const rows = outfitRows(view({ outfit: 'ashen-pilgrim' }));
    expect(rows.find((row) => row.outfit.id === 'ashen-pilgrim')).toMatchObject({ unlocked: true, selected: true });
    expect(rows.find((row) => row.outfit.id === 'seraph-white')).toMatchObject({ unlocked: false, selected: false });
  });

  it('kỹ năng di chuyển hiện tiến độ trạng từ + giới từ', () => {
    const [dash] = movementSkillRows(view());
    // Bộ từ dev có 5 trạng từ và 2 giới từ: đủ mở Bước Lướt (5), chưa đủ Thuấn Bộ (15).
    expect(dash).toMatchObject({ unlocked: true, progress: 7 });
    expect(movementSkillRows(view())[1]).toMatchObject({ unlocked: false, progress: 7 });
  });

  it('vòng từ: bật tắt từ, không quá số ô', () => {
    const full = Array.from({ length: RING_LOADOUT_SLOTS }, (_, index) => `w${index}`);
    expect(toggleLoadoutWord(full, 'w9')).toBe(full);
    expect(toggleLoadoutWord(full, 'w0')).toEqual(['w1', 'w2', 'w3']);
    expect(toggleLoadoutWord([], 'w0')).toEqual(['w0']);
  });

  it('tìm từ theo chữ tiếng Anh hoặc nghĩa tiếng Việt', () => {
    const { words } = devCitadelSeed();
    expect(filterWords(words, '  RUN ').map((word) => word.word)).toEqual(['run']);
    expect(filterWords(words, 'bảo vệ').map((word) => word.word)).toEqual(['protect']);
    expect(filterWords(words, '')).toBe(words);
  });

  it('vòng từ đã lưu có từ không còn học: bản nháp bỏ từ đó và cho lưu lại', () => {
    const { words } = devCitadelSeed();
    const saved = ['dev-run', 'gone-word'];
    const draft = initialLoadoutDraft(saved, words);
    expect(draft).toEqual(['dev-run']);
    expect(isSameLoadout(draft, saved)).toBe(false);
    expect(isSameLoadout(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('nút chọn từ: từ đang chọn đứng đầu, lọc theo ô tìm, có giới hạn', () => {
    const { words } = devCitadelSeed();
    expect(loadoutCandidates(words, ['dev-slowly'], '', 3).map((word) => word.id)).toEqual(['dev-slowly', 'dev-run', 'dev-away']);
    expect(loadoutCandidates(words, ['dev-slowly'], 'castle', 10).map((word) => word.id)).toEqual(['dev-slowly', 'dev-castle']);
    // Từ đang chọn không bị cắt dù vượt giới hạn.
    expect(loadoutCandidates(words, ['dev-run', 'dev-away'], '', 1)).toHaveLength(2);
  });
});
