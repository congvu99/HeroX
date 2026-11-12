import type { CitadelResponse } from '@herox/shared';
import { forgeItemRows, forgeUpgradeOption, type ForgeItemRow } from '../../citadel/citadel-view';
import { createButton, createElement, createUpgradeControl, type PanelBody, type PanelContext } from './panel-dom';

const SLOT_BONUS_LABEL = { weapon: 'sức chiêu', armor: 'máu' } as const;

/** Lò rèn: nâng cấp lò, rèn, nâng và mặc vũ khí, giáp; hiện chỉ số hiệp sĩ đã cộng trang bị. */
export class ForgePanel implements PanelBody {
  readonly element = createElement('div', { className: 'citadel-body' });

  constructor(private readonly context: PanelContext) {}

  render(view: CitadelResponse): void {
    const { heroStats, state } = view;
    const summary = createElement('div', { className: 'citadel-row citadel-summary' }, [
      createElement('span', { text: `Lò rèn cấp ${state.forgeLevel}` }),
      createElement('span', { className: 'citadel-muted', text: `Hiệp sĩ: ${heroStats.maxHp} máu · ${heroStats.power} sức chiêu` }),
      createUpgradeControl(forgeUpgradeOption(view), () => this.context.send({ type: 'upgrade', target: { kind: 'forge' } }), 'Lò rèn đã tối đa'),
    ]);
    const list = createElement('ul', { className: 'citadel-list' }, forgeItemRows(view).map((row) => this.renderItem(row)));
    this.element.replaceChildren(summary, list);
  }

  private renderItem(row: ForgeItemRow): HTMLElement {
    const { item, owned } = row;
    const status = owned === null ? `Cần lò rèn cấp ${item.requiredForgeLevel}` : `Cấp ${owned.level}${owned.equipped ? ' · đang mặc' : ''}`;
    const info = createElement('div', { className: 'citadel-info' }, [
      createElement('strong', { text: item.name }),
      createElement('span', { className: 'citadel-muted', text: `${status} · +${row.bonus} ${SLOT_BONUS_LABEL[item.slot]}` }),
      createElement('span', { className: 'citadel-description', text: item.description }),
    ]);
    const actions = createElement('div', { className: 'citadel-actions' }, [
      createUpgradeControl(row.upgrade, () => this.context.send({ type: 'upgrade', target: { kind: 'item', itemId: item.id } })),
      row.canEquip ? createButton('Mặc', () => this.context.send({ type: 'equip', itemId: item.id })) : null,
    ]);
    return createElement('li', { className: 'citadel-row' }, [info, actions]);
  }
}
