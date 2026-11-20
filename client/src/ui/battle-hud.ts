import { ENEMY_NAMES, MIN_VISIBLE_COMBO } from '@herox/shared';
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

/** Thanh đo (máu, khiên, đồng hồ đề, cửa sổ combo); chỉ đổi `transform` nên đổi mỗi khung cũng rẻ. */
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
 * Toạ độ chữ nổi tính theo pixel logic 640×360 rồi đổi sang phần trăm khung.
 * Màn dọc trên điện thoại: thẻ trên và dải nhập dính mép màn, nằm ở phần đen ngoài canvas.
 */
export class BattleHud {
  readonly root: HTMLElement;
  /** Dải dưới: chứa ô gõ hoặc vòng từ và các nút phụ. */
  readonly dockCenter: HTMLElement;
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
  private readonly combo: HTMLElement;
  private readonly comboCount: HTMLElement;
  private readonly comboTimer = new Meter('is-combo');
  private readonly floats: HTMLElement;
  private readonly center: HTMLElement;
  private readonly centerText: HTMLElement;
  private readonly centerButtons: HTMLElement;
  private readonly dockStart: HTMLElement;
  private readonly dockEnd: HTMLElement;
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

    this.comboCount = createElement('span', { className: 'battle-combo-count' });
    this.combo = createElement('div', { className: 'battle-combo' }, [this.comboCount, this.comboTimer.element]);
    this.combo.hidden = true;

    const top = createElement('div', { className: 'battle-top' }, [
      heroCard,
      createElement('div', { className: 'battle-top-center' }, [this.promptCard, this.combo]),
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
    const dock = createElement('div', { className: 'battle-dock' }, [this.dockStart, this.dockCenter, this.dockEnd]);

    this.stage = createElement('div', { className: 'battle-stage' }, [this.floats, top, dock, this.center]);
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

  /** Gọi khi combo đổi (không gọi mỗi khung); dưới `MIN_VISIBLE_COMBO` thì ẩn. */
  setComboCount(count: number): void {
    const visible = count >= MIN_VISIBLE_COMBO;
    this.combo.hidden = !visible;
    if (visible) this.comboCount.textContent = `Combo ×${count}`;
  }

  setComboTimer(remainingRatio: number): void {
    this.comboTimer.set(remainingRatio);
  }

  /** Bảng giữa màn (đang vào trận, kết quả); `buttons` rỗng thì chỉ hiện chữ. */
  showCenter(message: string, buttons: readonly BattleHudButton[] = []): void {
    this.centerText.textContent = message;
    this.centerButtons.replaceChildren(...buttons.map((button) => createButton(button.label, button.onClick, 'battle-button')));
    this.center.hidden = false;
    const first = this.centerButtons.querySelector('button');
    first?.focus({ preventScroll: true });
  }

  hideCenter(): void {
    this.center.hidden = true;
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
 * Giữ `frame` trùng khung canvas (canvas căn giữa, đổi cỡ khi zoom); ghi `--u` = 1 pixel logic tính theo px CSS
 * để cỡ chữ, khoảng cách của HUD co giãn cùng canvas. Trả hàm huỷ theo dõi.
 */
function trackCanvasFrame(canvas: HTMLCanvasElement, container: HTMLElement, frame: HTMLElement): () => void {
  const sync = (): void => {
    const canvasBox = canvas.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    frame.style.left = `${canvasBox.left - containerBox.left}px`;
    frame.style.top = `${canvasBox.top - containerBox.top}px`;
    frame.style.width = `${canvasBox.width}px`;
    frame.style.height = `${canvasBox.height}px`;
    frame.style.setProperty('--u', `${canvasBox.width / LOGICAL_WIDTH}px`);
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
