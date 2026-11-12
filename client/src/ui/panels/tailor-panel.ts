import type { CitadelResponse } from '@herox/shared';
import { outfitRows, type OutfitRow } from '../../citadel/citadel-view';
import { createButton, createElement, type PanelBody, type PanelContext } from './panel-dom';

function lockReason(row: OutfitRow): string {
  const { requiredLearned, requiredMastered } = row.outfit;
  const parts = [requiredLearned > 0 ? `${requiredLearned} từ đã học` : '', requiredMastered > 0 ? `${requiredMastered} từ đã thuộc` : ''];
  return `Cần ${parts.filter((part) => part !== '').join(' và ')}`;
}

/** Xưởng may: ngoại trang chỉ đổi hình, mở theo mốc học từ, không bán bằng vàng. */
export class TailorPanel implements PanelBody {
  readonly element = createElement('div', { className: 'citadel-body' });

  constructor(private readonly context: PanelContext) {}

  render(view: CitadelResponse): void {
    const items = outfitRows(view).map((row) => {
      let action: HTMLElement;
      if (row.selected) action = createElement('span', { className: 'citadel-ok', text: 'Đang mặc' });
      else if (row.unlocked) action = createButton('Mặc', () => this.context.send({ type: 'outfit', outfitId: row.outfit.id }));
      else action = createElement('span', { className: 'citadel-reason', text: lockReason(row) });
      return createElement('li', { className: 'citadel-row' }, [
        createElement('div', { className: 'citadel-info' }, [
          createElement('strong', { text: row.outfit.name }),
          createElement('span', { className: 'citadel-description', text: row.outfit.description }),
        ]),
        action,
      ]);
    });
    this.element.replaceChildren(
      createElement('p', { className: 'citadel-muted', text: 'Ngoại trang chỉ đổi dáng hiệp sĩ, không cộng chỉ số. Mẫu mới mở khi học thêm từ ở LingoBrain.' }),
      createElement('ul', { className: 'citadel-list' }, items),
    );
  }
}
