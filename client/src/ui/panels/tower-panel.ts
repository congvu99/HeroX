import { RING_LOADOUT_SLOTS, type CitadelResponse, type PartOfSpeechGroup } from '@herox/shared';
import {
  initialLoadoutDraft,
  isSameLoadout,
  loadoutCandidates,
  movementSkillRows,
  skillTierRows,
  toggleLoadoutWord,
} from '../../citadel/citadel-view';
import { createButton, createElement, createSearchInput, createUpgradeControl, type PanelBody, type PanelContext } from './panel-dom';

const SKILL_KIND_LABELS = { attack: 'Tấn công', guard: 'Phòng thủ', empower: 'Cường hoá', evade: 'Né tránh' } as const;
/** Màu từ loại giống vòng từ và nhãn trên quái (`docs/art-direction.md`). */
const POS_CLASS: Readonly<Record<PartOfSpeechGroup, string>> = {
  verb: 'pos-verb',
  noun: 'pos-noun',
  adj: 'pos-adj',
  adv: 'pos-adv',
  prep: 'pos-prep',
  other: 'pos-other',
};
/** Người học vài nghìn từ: chỉ vẽ chừng này nút để panel không giật trên điện thoại, còn lại tìm bằng ô tìm. */
const MAX_LOADOUT_CHIPS = 60;

/** Tháp phép: nâng bậc chiêu bằng pha lê, chọn từ gắn vòng từ, xem tiến độ kỹ năng di chuyển. */
export class TowerPanel implements PanelBody {
  readonly element = createElement('div', { className: 'citadel-body' });
  private readonly tiers = createElement('ul', { className: 'citadel-list' });
  private readonly search = createSearchInput('Tìm từ để gắn', 'Tìm từ gắn vào vòng từ', () => this.drawChips());
  private readonly chips = createElement('div', { className: 'citadel-chips' });
  private readonly save = createButton('', () => this.context.send({ type: 'loadout', wordIds: this.draft }));
  private readonly movement = createElement('ul', { className: 'citadel-list' });
  private view: CitadelResponse | null = null;
  /** Lựa chọn vòng từ đang sửa, chưa lưu. */
  private draft: readonly string[] = [];

  constructor(private readonly context: PanelContext) {
    this.element.append(
      createElement('h3', { className: 'citadel-heading', text: 'Bậc chiêu' }),
      this.tiers,
      createElement('h3', { className: 'citadel-heading', text: `Vòng từ (${RING_LOADOUT_SLOTS} ô)` }),
      createElement('p', { className: 'citadel-muted', text: 'Từ gắn vào vòng luôn hiện trong vòng từ khi ra trận; các ô còn lại là đáp án và từ nhiễu.' }),
      this.search,
      this.chips,
      this.save,
      createElement('h3', { className: 'citadel-heading', text: 'Kỹ năng di chuyển' }),
      this.movement,
    );
  }

  render(view: CitadelResponse): void {
    this.view = view;
    // Trạng thái mới (đã lưu, hoặc tải lại do máy khác đổi) thay bản nháp để không lưu đè.
    this.draft = initialLoadoutDraft(view.state.loadout, view.words);
    this.tiers.replaceChildren(...skillTierRows(view).map((row) =>
      createElement('li', { className: 'citadel-row' }, [
        createElement('div', { className: 'citadel-info' }, [
          createElement('strong', { text: `${SKILL_KIND_LABELS[row.kind]} · bậc ${row.tier}` }),
          createElement('span', { className: 'citadel-muted', text: row.name }),
        ]),
        createUpgradeControl(row.upgrade, () => this.context.send({ type: 'upgrade', target: { kind: 'skill', skill: row.kind } })),
      ])));
    this.movement.replaceChildren(...movementSkillRows(view).map(({ skill, unlocked, progress }) =>
      createElement('li', { className: 'citadel-row' }, [
        createElement('div', { className: 'citadel-info' }, [
          createElement('strong', { text: skill.name }),
          createElement('span', { className: 'citadel-description', text: skill.description }),
        ]),
        createElement('span', {
          className: unlocked ? 'citadel-ok' : 'citadel-reason',
          text: unlocked ? 'Đã mở' : `Trạng từ + giới từ: ${progress}/${skill.requiredAdvPrepWords}`,
        }),
      ])));
    this.drawChips();
  }

  private drawChips(): void {
    const view = this.view;
    if (view === null) return;
    if (view.words.length === 0) {
      this.chips.replaceChildren(createElement('p', { className: 'citadel-muted', text: 'Chưa có từ nào. Học ở LingoBrain để gắn từ vào vòng.' }));
    } else {
      this.chips.replaceChildren(...loadoutCandidates(view.words, this.draft, this.search.value, MAX_LOADOUT_CHIPS).map((word) => {
        const chip = createButton(`${word.emoji} ${word.word}`, () => this.toggle(word.id, chip), `citadel-chip ${POS_CLASS[word.pos]}`);
        chip.setAttribute('aria-pressed', String(this.draft.includes(word.id)));
        chip.title = word.meaning;
        return chip;
      }));
    }
    this.updateSave();
  }

  /** Chỉ đổi nút vừa chạm và nút Lưu, không dựng lại danh sách. */
  private toggle(wordId: string, chip: HTMLButtonElement): void {
    this.draft = toggleLoadoutWord(this.draft, wordId);
    chip.setAttribute('aria-pressed', String(this.draft.includes(wordId)));
    this.updateSave();
  }

  private updateSave(): void {
    this.save.textContent = `Lưu vòng từ (${this.draft.length}/${RING_LOADOUT_SLOTS})`;
    // So với bản đã lưu (kể cả từ không còn học) để xoá được từ cũ khỏi vòng.
    this.save.disabled = this.view === null || isSameLoadout(this.draft, this.view.state.loadout);
  }
}
