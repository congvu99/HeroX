import { RING_SIZE } from '@herox/shared';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/display';
import { createElement } from './panels/panel-dom';

export interface RingOption {
  readonly wordId: string;
  readonly label: string;
}

/** Tâm vòng (thân hiệp sĩ) theo pixel logic khung 360×780. */
export interface RingCenter {
  readonly x: number;
  readonly y: number;
}

export interface WordRingCallbacks {
  /**
   * Gọi khi chạm một từ: vòng tan bắt đầu (animation đang chạy). Màn trận dừng đồng hồ cho
   * "khoảnh khắc" rồi sau RING_DISMISS_MS mới gửi chiêu.
   */
  readonly onDismissStart: (wordId: string) => void;
}

/** Thời gian vòng tan trước khi ra chiêu ("khoảnh khắc"); cũng là thời gian màn trận dừng đồng hồ. */
export const RING_DISMISS_MS = 260;

/** Cột của nút trong vòng: chẵn bên trái hiệp sĩ, lẻ bên phải (CSS đặt cột theo đúng thứ tự này). */
export function ringSide(index: number): 'left' | 'right' {
  return index % 2 === 0 ? 'left' : 'right';
}

/**
 * Vòng từ cho cảm ứng: 6 nút DOM mang `data-word-id`, chia hai cột 3 nút ôm hai bên hiệp sĩ.
 * Xếp bằng CSS grid (cột giữa chừa cho hiệp sĩ) nên nhãn dài chỉ xuống dòng, không bao giờ đè nút khác,
 * và mọi đề dùng cùng một bố cục. Từ bung ra từ hiệp sĩ; chạm một từ thì từ chọn loé, từ khác bắn ra
 * hai bên, cả vòng tan (~260ms) rồi mới ra chiêu. Nút cao ≥ 44 px (khuyến nghị cho ngón tay) do CSS đặt.
 */
export class WordRing {
  readonly element: HTMLElement;
  private readonly buttons: HTMLButtonElement[];
  private enabled = true;
  private dismissing = false;

  constructor(
    private readonly callbacks: WordRingCallbacks,
    center: RingCenter = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 },
  ) {
    this.buttons = Array.from({ length: RING_SIZE }, (_, index) => this.createButton(index));
    this.element = createElement('div', { className: 'battle-ring' }, this.buttons);
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', 'Vòng từ');
    // Toạ độ logic → % khung (như chữ nổi của HUD); CSS dịch -50% để tâm khối trùng thân hiệp sĩ.
    this.element.style.top = `${(center.y / LOGICAL_HEIGHT) * 100}%`;
  }

  setOptions(options: readonly RingOption[]): void {
    // Đề mới: xoá trạng thái vòng tan của đề trước.
    this.dismissing = false;
    this.element.classList.remove('is-dismissing');
    this.buttons.forEach((button, index) => {
      const option = options[index];
      button.textContent = option?.label ?? '';
      button.hidden = option === undefined;
      button.classList.remove('is-picked', 'is-dismissed');
      // Gỡ khoá của vòng tan trước; trạng thái bật/tắt theo `enabled` hiện tại (đề mới có thể còn bị khoá chống bấm vội).
      button.disabled = !this.enabled;
      if (option === undefined) delete button.dataset['wordId'];
      else button.dataset['wordId'] = option.wordId;
    });
    this.replayEnter();
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  /** Khoá vòng từ (đề chưa sẵn sàng, trận đã xong) mà vẫn hiện để người chơi đọc trước. */
  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    // Đang diễn vòng tan thì nút đã có `.is-dismissed`/`.is-picked`, không ghi đè `disabled` để ra chiêu xong mới mở.
    if (!this.dismissing) for (const button of this.buttons) button.disabled = !enabled;
  }

  /** Chạy lại animation bung ra cho đề mới: gỡ class, ép reflow, gắn lại (cách chuẩn để restart CSS animation). */
  private replayEnter(): void {
    this.element.classList.remove('is-entering');
    void this.element.offsetWidth;
    this.element.classList.add('is-entering');
  }

  private createButton(index: number): HTMLButtonElement {
    const button = createElement('button', { className: `battle-ring-option is-${ringSide(index)}` });
    button.type = 'button';
    button.hidden = true;
    // Thứ tự hàng để bung lần lượt từ trên xuống.
    button.style.setProperty('--row', String(Math.floor(index / 2)));
    // `pointerdown` thay vì `click`: chạm là bắt đầu "khoảnh khắc" ngay, không chờ nhấc ngón như click trên iOS.
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.pick(button);
    });
    // Enter/Space trên nút đang focus, VoiceOver, Switch Control chỉ phát `click` (detail = 0); chạm/chuột đã xử lý ở trên.
    button.addEventListener('click', (event) => {
      if (event.detail === 0) this.pick(button);
    });
    return button;
  }

  private pick(button: HTMLButtonElement): void {
    const wordId = button.dataset['wordId'];
    if (!this.enabled || this.dismissing || wordId === undefined) return;
    this.startDismiss(button, wordId);
  }

  /**
   * Bắt đầu vòng tan: từ chọn loé, từ khác bắn ra, khoá chạm; báo từ cho màn trận.
   * Màn trận lo nhịp chờ RING_DISMISS_MS (bằng đồng hồ scene, tự huỷ khi rời trận) rồi mới ra chiêu,
   * nên vòng từ không giữ timer riêng.
   */
  private startDismiss(picked: HTMLButtonElement, wordId: string): void {
    this.dismissing = true;
    this.element.classList.add('is-dismissing');
    for (const button of this.buttons) {
      if (button.hidden) continue;
      button.classList.add(button === picked ? 'is-picked' : 'is-dismissed');
      button.disabled = true;
    }
    this.callbacks.onDismissStart(wordId);
  }
}
