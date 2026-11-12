import { BUILDINGS, CITADEL_STAGE_NAMES, type BuildingId, type CitadelAction, type CitadelResponse } from '@herox/shared';
import type { CitadelGateway, CitadelGatewayResult } from '../../citadel/citadel-gateway';
import { ForgePanel } from './forge-panel';
import { LibraryPanel } from './library-panel';
import { createButton, createElement, type NoticeTone, type PanelBody, type PanelContext } from './panel-dom';
import { TailorPanel } from './tailor-panel';
import { TowerPanel } from './tower-panel';
import './citadel-panel.css';

const SESSION_EXPIRED_MESSAGE = 'Phiên LingoBrain đã hết, mở LingoBrain đăng nhập lại rồi quay về';
const TITLE_ID = 'citadel-panel-title';
/** Tin báo tự ẩn sau chừng này, đủ đọc một câu. */
const NOTICE_HIDE_MS = 4_000;

const PANEL_BODIES: Readonly<Record<BuildingId, (context: PanelContext) => PanelBody>> = {
  forge: (context) => new ForgePanel(context),
  'arcane-tower': (context) => new TowerPanel(context),
  tailor: (context) => new TailorPanel(context),
  library: (context) => new LibraryPanel(context),
};

function dailyCrystalLabel(view: CitadelResponse): string {
  const { amount, claimedToday } = view.dailyCrystals;
  if (claimedToday) return 'Đã nhận pha lê hôm nay';
  return amount > 0 ? `Nhận ${amount} pha lê hôm nay` : 'Học ở LingoBrain để nhận pha lê';
}

/**
 * Khung DOM chung của công trình: tiêu đề, vàng, pha lê, nút nhận pha lê, tin báo và nội dung riêng.
 * Chỉ một thao tác chạy một lúc; mọi thay đổi đi qua gateway (server kiểm chi phí, điều kiện, `rowVersion`).
 */
export class CitadelPanel {
  private readonly root: HTMLElement;
  private readonly resources = createElement('div', { className: 'citadel-resources' });
  private readonly notice = createElement('p', { className: 'citadel-notice' });
  /** Dòng chờ hoặc lỗi lúc mở; nội dung công trình chỉ hiện khi đã có trạng thái. */
  private readonly status = createElement('p', { className: 'citadel-muted', text: 'Đang mở cửa…' });
  private readonly body: PanelBody;
  private readonly closeButton = createButton('Đóng', () => this.close(), 'citadel-button citadel-close');
  private busy = false;
  private closed = false;
  private noticeTimer: number | undefined;

  constructor(
    parent: HTMLElement,
    buildingId: BuildingId,
    private readonly gateway: CitadelGateway,
    private readonly onClose: () => void,
    /** Báo trạng thái mới cho bản đồ (giai đoạn thành trì vẽ trên map). */
    private readonly onView: (view: CitadelResponse) => void = () => undefined,
  ) {
    const building = BUILDINGS[buildingId];
    this.body = PANEL_BODIES[buildingId]({
      send: (action) => void this.send(action),
      notify: (message, tone) => this.showNotice(message, tone),
    });
    this.notice.setAttribute('role', 'status');
    this.notice.setAttribute('aria-live', 'polite');
    const title = createElement('h2', { className: 'citadel-title', text: building.name });
    title.id = TITLE_ID;
    const header = createElement('header', { className: 'citadel-header' }, [
      createElement('div', {}, [
        title,
        createElement('p', { className: 'citadel-muted', text: building.description }),
      ]),
      this.closeButton,
    ]);
    const dialog = createElement('section', { className: 'citadel-dialog' }, [header, this.resources, this.notice, this.status, this.body.element]);
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', TITLE_ID);
    this.root = createElement('div', { className: 'citadel-overlay' }, [dialog]);
    this.body.element.hidden = true;
    document.addEventListener('keydown', this.handleKeyDown);
    parent.appendChild(this.root);
    // Bàn phím và trình đọc màn hình vào thẳng hộp thoại thay vì đứng lại ở canvas.
    this.closeButton.focus();
  }

  async open(): Promise<void> {
    this.setBusy(true);
    const result = await this.gateway.load();
    if (this.closed) return;
    this.setBusy(false);
    if (result.kind === 'ok' || result.kind === 'reloaded') this.show(result.response);
    else {
      this.status.className = 'citadel-reason';
      this.status.textContent = this.failureMessage(result);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    window.clearTimeout(this.noticeTimer);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.body.dispose?.();
    this.root.remove();
    this.onClose();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.close();
  };

  private async send(action: CitadelAction): Promise<void> {
    if (this.busy) return;
    this.setBusy(true);
    const result = await this.gateway.send(action);
    if (this.closed) return;
    this.setBusy(false);
    if (result.kind === 'ok') {
      this.show(result.response);
    } else if (result.kind === 'reloaded') {
      this.show(result.response);
      this.showNotice(result.message, 'info');
    } else {
      this.showNotice(this.failureMessage(result), 'error');
    }
  }

  private failureMessage(result: Exclude<CitadelGatewayResult, { kind: 'ok' | 'reloaded' }>): string {
    return result.kind === 'unauthenticated' ? SESSION_EXPIRED_MESSAGE : result.message;
  }

  private show(view: CitadelResponse): void {
    const claim = createButton(dailyCrystalLabel(view), () => void this.send({ type: 'daily-crystals' }));
    claim.disabled = view.dailyCrystals.claimedToday || view.dailyCrystals.amount === 0;
    this.resources.replaceChildren(
      createElement('span', { className: 'citadel-gold', text: `Vàng ${view.state.gold}` }),
      createElement('span', { className: 'citadel-crystal', text: `Pha lê ${view.state.crystals}` }),
      createElement('span', { className: 'citadel-muted', text: `Thành trì: ${CITADEL_STAGE_NAMES[view.stage]} · ${view.learning.learned} từ đã học` }),
      claim,
    );
    this.body.render(view);
    this.onView(view);
    this.status.hidden = true;
    this.body.element.hidden = false;
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.root.classList.toggle('is-busy', busy);
    this.root.setAttribute('aria-busy', String(busy));
  }

  private showNotice(message: string, tone: NoticeTone): void {
    this.notice.textContent = message;
    this.notice.dataset['tone'] = tone;
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      this.notice.textContent = '';
    }, NOTICE_HIDE_MS);
  }
}
