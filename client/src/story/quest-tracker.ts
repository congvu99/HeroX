import { activeQuests, isChapterComplete, type StoryProgress } from '@herox/shared';
import { createElement } from '../ui/panels/panel-dom';
import './story.css';

/** Thông báo ngắn tự tắt sau thời gian này. */
const TOAST_MS = 3_200;
const MAX_TOASTS = 3;
/** Chương mới nhất đã có nội dung; xong chương này thì báo cách mở chương sau. */
const LATEST_CHAPTER = 1;

/**
 * Bảng nhiệm vụ DOM ở góc trên trái bản đồ và các thông báo ngắn (cổng khoá, nhặt thánh tích).
 * Sống suốt phiên chơi, không gắn với level nên không nháy khi qua cổng.
 */
export class QuestTracker {
  private readonly root: HTMLElement;
  private readonly list: HTMLElement;
  private readonly toasts: HTMLElement;

  constructor(parent: HTMLElement) {
    this.list = createElement('ul', { className: 'quest-list' });
    const panel = createElement('div', { className: 'quest-panel' }, [createElement('div', { className: 'quest-title', text: 'Nhiệm vụ' }), this.list]);
    this.toasts = createElement('div', { className: 'quest-toasts' });
    this.toasts.setAttribute('aria-live', 'polite');
    this.root = createElement('div', { className: 'quest-tracker' }, [panel, this.toasts]);
    parent.appendChild(this.root);
  }

  render(progress: StoryProgress): void {
    const quests = activeQuests(progress);
    const items = quests.map((view) =>
      createElement('li', { className: 'quest-item' }, [
        createElement('span', { className: 'quest-name', text: view.total > 1 ? `${view.quest.title} (${view.done}/${view.total})` : view.quest.title }),
        createElement('span', { className: 'quest-objective', text: view.objective }),
      ]),
    );
    if (items.length === 0 && isChapterComplete(LATEST_CHAPTER, progress)) {
      items.push(createElement('li', { className: 'quest-item', text: 'Chương 1 đã xong. Học thêm từ ở LingoBrain để mở Rừng Tro.' }));
    }
    this.list.replaceChildren(...items);
  }

  /** Ẩn khi màn trận, panel hay hộp thoại phủ lên. */
  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  toast(message: string): void {
    const toast = createElement('div', { className: 'quest-toast', text: message });
    this.toasts.appendChild(toast);
    while (this.toasts.childElementCount > MAX_TOASTS) this.toasts.firstElementChild?.remove();
    window.setTimeout(() => toast.remove(), TOAST_MS);
  }

  destroy(): void {
    this.root.remove();
  }
}
