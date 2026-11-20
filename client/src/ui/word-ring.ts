import { RING_SIZE } from '@herox/shared';
import { createElement } from './panels/panel-dom';

export interface RingOption {
  readonly wordId: string;
  readonly label: string;
}

/**
 * Vòng từ cho cảm ứng: 6 nút DOM xếp 3×2, chạm một nút là chọn từ đó. Nút dựng một lần, mỗi đề chỉ đổi chữ.
 * Nút cao ≥ 44 px (khuyến nghị của Apple cho ngón tay) do CSS `battle-ring` đặt.
 */
export class WordRing {
  readonly element: HTMLElement;
  private readonly buttons: HTMLButtonElement[];
  private enabled = true;

  constructor(private readonly onPick: (wordId: string) => void) {
    this.buttons = Array.from({ length: RING_SIZE }, () => this.createButton());
    this.element = createElement('div', { className: 'battle-ring' }, this.buttons);
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', 'Vòng từ');
  }

  setOptions(options: readonly RingOption[]): void {
    this.buttons.forEach((button, index) => {
      const option = options[index];
      button.textContent = option?.label ?? '';
      button.hidden = option === undefined;
      if (option === undefined) delete button.dataset['wordId'];
      else button.dataset['wordId'] = option.wordId;
    });
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  /** Khoá vòng từ (đề chưa sẵn sàng, trận đã xong) mà vẫn hiện để người chơi đọc trước. */
  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    for (const button of this.buttons) button.disabled = !enabled;
  }

  private createButton(): HTMLButtonElement {
    const button = createElement('button', { className: 'battle-ring-option' });
    button.type = 'button';
    button.hidden = true;
    // `pointerdown` thay vì `click`: chạm là tung chiêu ngay, không chờ nhấc ngón như click trên iOS.
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const wordId = button.dataset['wordId'];
      if (this.enabled && wordId !== undefined) this.onPick(wordId);
    });
    return button;
  }
}
