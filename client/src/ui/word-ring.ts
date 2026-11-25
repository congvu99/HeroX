import { RING_SIZE } from '@herox/shared';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/display';
import { createElement } from './panels/panel-dom';

export interface RingOption {
  readonly wordId: string;
  readonly label: string;
}

/** Tâm vòng (vị trí hiệp sĩ) theo pixel logic khung 360×780. */
export interface RingCenter {
  readonly x: number;
  readonly y: number;
}

export interface WordRingCallbacks {
  /**
   * Gọi khi chạm một từ ở bố cục cung: vòng tan bắt đầu (animation đang chạy). Màn trận dừng đồng hồ cho
   * "khoảnh khắc" rồi sau RING_DISMISS_MS mới gửi chiêu.
   */
  readonly onDismissStart: (wordId: string) => void;
  /** Gọi khi chọn một từ ở bố cục lưới dự phòng: màn trận gửi chiêu ngay (không có vòng tan). */
  readonly onPick: (wordId: string) => void;
}

/** Thời gian vòng tan trước khi ra chiêu ("khoảnh khắc"); cũng là thời gian màn trận dừng đồng hồ. */
export const RING_DISMISS_MS = 260;

export type RingLayout = 'arc' | 'grid';

/**
 * Số ký tự nhãn tối đa còn hợp với nút vòng cung; dài hơn thì rớt về lưới 2×3 để đọc trọn chữ
 * (nút cung hẹp hơn nút lưới nên ngưỡng đặt thấp).
 */
const ARC_MAX_LABEL_LENGTH = 9;

/** Nửa góc mở của cung dưới (độ): 6 nút trải trong cung ±ARC_SPREAD quanh hướng xuống; ≤90° để biên không vượt lên trên ngang tâm. */
const ARC_SPREAD_DEG = 90;
/** Bán kính cung (px logic) từ tâm hiệp sĩ tới tâm nút. */
const ARC_RADIUS = 118;

/**
 * Chọn bố cục theo nhãn dài nhất: cung khi chữ không quá dài, ngược lại rớt về lưới 2×3 để đọc trọn chữ.
 * Hàm thuần để test không cần DOM.
 */
export function chooseRingLayout(longestLabelLength: number): RingLayout {
  return longestLabelLength <= ARC_MAX_LABEL_LENGTH ? 'arc' : 'grid';
}

/**
 * Tâm các nút trên cung dưới quanh tâm (px logic): trải đều trong cung hướng xuống (90°) từ -spread tới +spread.
 * Hàm thuần để test vị trí không cần DOM.
 */
export function arcButtonPoints(center: RingCenter, count: number): { readonly x: number; readonly y: number }[] {
  const spread = (ARC_SPREAD_DEG * Math.PI) / 180;
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const angle = Math.PI / 2 + (t - 0.5) * 2 * spread;
    return { x: center.x + Math.cos(angle) * ARC_RADIUS, y: center.y + Math.sin(angle) * ARC_RADIUS };
  });
}

/**
 * Vòng từ cho cảm ứng: 6 nút DOM mang `data-word-id`. Hai bố cục:
 * - **Cung dưới** (mặc định): nút trải thành cung phía dưới và hai bên hiệp sĩ, bao quanh nhân vật.
 *   Chạm một từ thì các từ khác bắn ra, từ chọn loé sáng, cả vòng tan (~260ms) rồi mới ra chiêu.
 * - **Lưới 2×3** (dự phòng): từ quá dài để nút cung đọc trọn; chạm là chọn luôn (giữ cách cũ, dễ đọc chữ dài).
 * Nút cao ≥ 44 px (khuyến nghị của Apple cho ngón tay) do CSS `battle-ring-option` đặt.
 */
export class WordRing {
  readonly element: HTMLElement;
  private readonly buttons: HTMLButtonElement[];
  private enabled = true;
  private layout: 'arc' | 'grid' = 'arc';
  private dismissing = false;

  constructor(
    private readonly callbacks: WordRingCallbacks,
    private readonly center: RingCenter = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 },
  ) {
    this.buttons = Array.from({ length: RING_SIZE }, (_, index) => this.createButton(index));
    this.element = createElement('div', { className: 'battle-ring' }, this.buttons);
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', 'Vòng từ');
    this.applyLayout();
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
    this.chooseLayout(options);
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

  private chooseLayout(options: readonly RingOption[]): void {
    const longest = options.reduce((max, option) => Math.max(max, option.label.length), 0);
    const next = chooseRingLayout(longest);
    if (next === this.layout) return;
    this.layout = next;
    this.applyLayout();
  }

  private applyLayout(): void {
    const arc = this.layout === 'arc';
    this.element.classList.toggle('is-arc', arc);
    this.element.classList.toggle('is-grid', !arc);
    if (arc) this.positionArc();
    else this.clearArcPosition();
  }

  /** Đặt từng nút theo cung dưới quanh tâm hiệp sĩ; toạ độ logic → % khung (như chữ nổi của HUD). */
  private positionArc(): void {
    const points = arcButtonPoints(this.center, this.buttons.length);
    this.buttons.forEach((button, index) => {
      const point = points[index];
      if (point === undefined) return;
      button.style.left = `${(point.x / LOGICAL_WIDTH) * 100}%`;
      button.style.top = `${(point.y / LOGICAL_HEIGHT) * 100}%`;
    });
  }

  private clearArcPosition(): void {
    for (const button of this.buttons) {
      button.style.left = '';
      button.style.top = '';
    }
  }

  private createButton(index: number): HTMLButtonElement {
    const button = createElement('button', { className: 'battle-ring-option' });
    button.type = 'button';
    button.hidden = true;
    button.style.setProperty('--i', String(index));
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
    if (this.layout === 'grid') {
      // Lưới dự phòng: chọn luôn, không có vòng tan (giữ cách cũ cho từ dài).
      this.callbacks.onPick(wordId);
      return;
    }
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
