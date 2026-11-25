import { ENEMY_NAMES } from '@herox/shared';
import type { FloatTone } from '../battle/battle-cues';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/display';
import { createButton, createElement } from './panels/panel-dom';
import './battle-hud.css';

/** Giữ tối đa chừng này chữ nổi cùng lúc; chữ cũ nhất bị gỡ khi có chữ mới. */
const MAX_FLOATS = 8;
/** Còn dưới tỉ lệ này thời gian của đề thì thanh đồng hồ chuyển đỏ, nhấp nháy. */
const URGENT_RATIO = 0.3;

export function enemyDisplayName(kind: string): string {
  return ENEMY_NAMES[kind] ?? kind;
}

export interface BattleHudButton {
  readonly label: string;
  readonly onClick: () => void;
}

/** Thanh đo (máu, khiên, đồng hồ đề); chỉ đổi `transform` nên đổi mỗi khung cũng rẻ. */
class Meter {
  readonly element: HTMLElement;
  private readonly fill: HTMLElement;
  private lastRatio = -1;

  constructor(className: string) {
    this.fill = createElement('i');
    this.element = createElement('div', { className: `battle-meter ${className}` }, [this.fill]);
  }

  set(ratio: number): void {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
    // Làm tròn để không ghi style mỗi khung khi tỉ lệ chỉ đổi rất nhỏ.
    const rounded = Math.round(clamped * 500) / 500;
    if (rounded === this.lastRatio) return;
    this.lastRatio = rounded;
    this.fill.style.transform = `scaleX(${rounded})`;
  }
}

/**
 * HUD màn trận dựng bằng DOM (chữ tiếng Việt sắc nét ở mọi mức zoom), phủ đúng khung canvas.
 * Toạ độ chữ nổi tính theo pixel logic của khung dọc 360×780 rồi đổi sang phần trăm khung.
 * Màn dọc trên điện thoại: thẻ trên và dải nhập dính mép màn, nằm ở phần đen ngoài canvas.
 */
export class BattleHud {
  readonly root: HTMLElement;
  /** Dải dưới: chứa ô gõ và các nút phụ. */
  readonly dockCenter: HTMLElement;
  /** Lớp phủ sân để đặt vòng từ ôm hai bên hiệp sĩ (vị trí dọc theo % khung). */
  readonly ringLayer: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly heroStats: HTMLElement;
  private readonly heroHp = new Meter('is-hp');
  private readonly heroShield = new Meter('is-shield');
  private readonly enemyCard: HTMLElement;
  private readonly enemyName: HTMLElement;
  private readonly enemyStats: HTMLElement;
  private readonly enemyHp = new Meter('is-enemy-hp');
  private readonly promptCard: HTMLElement;
  private readonly promptEmoji: HTMLElement;
  private readonly promptMeaning: HTMLElement;
  private readonly promptTimer = new Meter('is-timer');
  private readonly floats: HTMLElement;
  private readonly center: HTMLElement;
  private readonly centerText: HTMLElement;
  private readonly centerButtons: HTMLElement;
  private readonly dockStart: HTMLElement;
  private readonly dockEnd: HTMLElement;
  private readonly dock: HTMLElement;
  /** Hai chỗ đặt thẻ đề: trong dock đáy ngay trên ô gõ (kiểu gõ) và ngay trên hàng nút phụ (vòng từ). */
  private readonly promptSlotDock: HTMLElement;
  private readonly promptSlotRing: HTMLElement;
  private readonly stopTracking: () => void;

  constructor(parent: HTMLElement, canvas: HTMLCanvasElement, heroName: string) {
    const heroLabel = createElement('span', { className: 'battle-card-name', text: heroName });
    this.heroStats = createElement('span', { className: 'battle-card-stats' });
    const heroCard = createElement('div', { className: 'battle-card is-hero' }, [
      createElement('div', { className: 'battle-card-head' }, [heroLabel, this.heroStats]),
      this.heroHp.element,
      this.heroShield.element,
    ]);

    this.enemyName = createElement('span', { className: 'battle-card-name' });
    this.enemyStats = createElement('span', { className: 'battle-card-stats' });
    this.enemyCard = createElement('div', { className: 'battle-card is-enemy' }, [
      createElement('div', { className: 'battle-card-head' }, [this.enemyName, this.enemyStats]),
      this.enemyHp.element,
    ]);
    this.enemyCard.hidden = true;

    this.promptEmoji = createElement('span', { className: 'battle-prompt-emoji' });
    this.promptMeaning = createElement('span', { className: 'battle-prompt-meaning' });
    this.promptCard = createElement('div', { className: 'battle-prompt' }, [
      createElement('div', { className: 'battle-prompt-text' }, [this.promptEmoji, this.promptMeaning]),
      this.promptTimer.element,
    ]);
    this.promptCard.setAttribute('aria-live', 'polite');
    this.promptCard.hidden = true;


    const top = createElement('div', { className: 'battle-top' }, [
      heroCard,
      this.enemyCard,
    ]);

    this.floats = createElement('div', { className: 'battle-floats' });
    this.floats.setAttribute('aria-hidden', 'true');

    this.centerText = createElement('p', { className: 'battle-center-text' });
    this.centerButtons = createElement('div', { className: 'battle-center-buttons' });
    this.center = createElement('div', { className: 'battle-center' }, [
      createElement('div', { className: 'battle-center-box' }, [this.centerText, this.centerButtons]),
    ]);
    this.center.setAttribute('role', 'status');
    this.center.hidden = true;

    this.dockStart = createElement('div', { className: 'battle-dock-side' });
    this.dockCenter = createElement('div', { className: 'battle-dock-center' });
    this.dockEnd = createElement('div', { className: 'battle-dock-side is-end' });
    // Đề nằm ngay trên ô gõ, dưới hiệp sĩ (kiểu gõ): mắt đọc đề rồi gõ mà không phải nhìn lên đầu sân.
    this.dock = createElement('div', { className: 'battle-dock' }, [this.dockStart, this.dockCenter, this.dockEnd]);
    this.promptSlotDock = createElement('div', { className: 'battle-prompt-slot is-dock' }, [this.promptCard]);
    this.promptSlotRing = createElement('div', { className: 'battle-prompt-slot is-ring' });

    // Lớp vòng từ: phủ sân; dưới `dock`/`center` về thứ tự xếp chồng.
    this.ringLayer = createElement('div', { className: 'battle-ring-layer' });
    this.ringLayer.setAttribute('aria-hidden', 'false');

    this.stage = createElement('div', { className: 'battle-stage' }, [
      this.floats,
      top,
      this.promptSlotRing,
      this.ringLayer,
      this.promptSlotDock,
      this.dock,
      this.center,
    ]);
    this.root = createElement('div', { className: 'battle-hud' }, [this.stage]);
    parent.appendChild(this.root);
    this.stopTracking = trackCanvasFrame(canvas, parent, this.stage);
  }

  /** Nút phụ ở hai đầu dải dưới (đổi kiểu nhập, âm thanh, rời trận); trả nút để đổi nhãn sau. */
  addDockButton(side: 'start' | 'end', button: BattleHudButton): HTMLButtonElement {
    const element = createButton(button.label, button.onClick, 'battle-button is-small');
    (side === 'start' ? this.dockStart : this.dockEnd).appendChild(element);
    return element;
  }

  /**
   * Chỗ đặt thẻ đề: `dock` ngay trên ô gõ ở đáy (kiểu gõ), `ring` dưới vòng từ, ngay trên hàng nút phụ
   * (giữ nửa trên sân trống để đề không che quái).
   */
  setPromptPlacement(placement: 'dock' | 'ring'): void {
    const slot = placement === 'ring' ? this.promptSlotRing : this.promptSlotDock;
    if (this.promptCard.parentElement !== slot) slot.appendChild(this.promptCard);
  }

  setHero(hp: number, maxHp: number, shield: number): void {
    this.heroHp.set(hp / maxHp);
    this.heroShield.set(shield / maxHp);
    this.heroStats.textContent = shield > 0 ? `${hp}/${maxHp} · khiên ${shield}` : `${hp}/${maxHp}`;
  }

  setEnemy(kind: string, hp: number, maxHp: number, elite: boolean, shielded: boolean): void {
    this.enemyCard.hidden = false;
    this.enemyCard.classList.toggle('is-elite', elite);
    this.enemyCard.classList.toggle('is-shielded', shielded);
    this.enemyName.textContent = `${elite ? 'Tinh anh · ' : ''}${enemyDisplayName(kind)}`;
    this.enemyStats.textContent = `${hp}/${maxHp}`;
    this.enemyHp.set(hp / maxHp);
  }

  setPrompt(emoji: string, meaning: string): void {
    this.promptEmoji.textContent = emoji;
    this.promptMeaning.textContent = meaning;
    this.promptCard.hidden = false;
    // Chạy lại hiệu ứng hiện đề cho mỗi đề mới.
    this.promptCard.classList.remove('is-new');
    void this.promptCard.offsetWidth;
    this.promptCard.classList.add('is-new');
  }

  clearPrompt(): void {
    this.promptCard.hidden = true;
    this.promptTimer.set(0);
  }

  setPromptTimer(ratio: number): void {
    this.promptTimer.set(ratio);
    this.promptCard.classList.toggle('is-urgent', ratio > 0 && ratio < URGENT_RATIO);
  }

  /** Bảng giữa màn (đang vào trận, kết quả); `buttons` rỗng thì chỉ hiện chữ. */
  showCenter(message: string, buttons: readonly BattleHudButton[] = []): void {
    this.centerText.textContent = message;
    this.centerButtons.replaceChildren(...buttons.map((button) => createButton(button.label, button.onClick, 'battle-button')));
    this.center.hidden = false;
    this.stage.classList.add('is-center-open');
    const first = this.centerButtons.querySelector('button');
    first?.focus({ preventScroll: true });
  }

  hideCenter(): void {
    this.center.hidden = true;
    this.stage.classList.remove('is-center-open');
    this.centerButtons.replaceChildren();
  }

  /** Chữ nổi tại (x, y) pixel logic, bay lên rồi mờ; tự gỡ khi xong. */
  floatText(x: number, y: number, text: string, tone: FloatTone): void {
    const label = createElement('span', { className: `battle-float is-${tone}`, text });
    label.style.left = `${(x / LOGICAL_WIDTH) * 100}%`;
    label.style.top = `${(y / LOGICAL_HEIGHT) * 100}%`;
    label.addEventListener('animationend', () => label.remove(), { once: true });
    this.floats.appendChild(label);
    while (this.floats.childElementCount > MAX_FLOATS) this.floats.firstElementChild?.remove();
  }

  destroy(): void {
    this.stopTracking();
    this.root.remove();
  }
}

/**
 * Giữ `frame` trùng khung thiết kế 360×780 nằm giữa canvas (canvas có thể rộng/cao hơn, căn giữa, đổi cỡ khi zoom);
 * ghi `--u` = 1 pixel logic tính theo px CSS để cỡ chữ, khoảng cách của HUD co giãn cùng canvas. Trả hàm huỷ theo dõi.
 */
function trackCanvasFrame(canvas: HTMLCanvasElement, container: HTMLElement, frame: HTMLElement): () => void {
  const sync = (): void => {
    const canvasBox = canvas.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    // `canvas.width` là bề rộng khung nhìn logic (Phaser đặt bằng cỡ game), không phải px thiết bị.
    const unit = canvas.width > 0 ? canvasBox.width / canvas.width : 1;
    const offsetX = ((canvas.width - LOGICAL_WIDTH) / 2) * unit;
    const offsetY = ((canvas.height - LOGICAL_HEIGHT) / 2) * unit;
    frame.style.left = `${canvasBox.left - containerBox.left + offsetX}px`;
    frame.style.top = `${canvasBox.top - containerBox.top + offsetY}px`;
    frame.style.width = `${LOGICAL_WIDTH * unit}px`;
    frame.style.height = `${LOGICAL_HEIGHT * unit}px`;
    frame.style.setProperty('--u', `${unit}px`);
  };
  sync();
  const observer = new ResizeObserver(sync);
  observer.observe(canvas);
  observer.observe(container);
  window.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('resize', sync);
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', sync);
    window.visualViewport?.removeEventListener('resize', sync);
  };
}
