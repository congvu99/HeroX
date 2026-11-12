import type { CitadelAction, CitadelResponse } from '@herox/shared';

interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
}

/** Tạo phần tử DOM gọn; chữ luôn gán bằng `textContent` để từ, nghĩa từ server không thành HTML. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly (Node | null)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className !== undefined) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  for (const child of children) {
    if (child !== null) element.appendChild(child);
  }
  return element;
}

export function createButton(label: string, onClick: () => void, className = 'citadel-button'): HTMLButtonElement {
  const button = createElement('button', { className, text: label });
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

export type NoticeTone = 'info' | 'error';

/** Panel gọi lên khung chung: gửi thao tác (khung lo khoá nút khi đang chờ) và báo tin. */
export interface PanelContext {
  send(action: CitadelAction): void;
  notify(message: string, tone: NoticeTone): void;
}

/** Nội dung riêng của một công trình; khung gọi `render` mỗi khi có trạng thái mới. */
export interface PanelBody {
  readonly element: HTMLElement;
  render(view: CitadelResponse): void;
  /** Giải phóng tài nguyên ngoài DOM (âm thanh) khi đóng panel. */
  dispose?(): void;
}

/** Nút nâng cấp kèm chi phí; bị khoá thì hiện lý do (thiếu vàng, cần học thêm từ…). */
export function createUpgradeControl(
  option: { readonly label: string; readonly cost: string; readonly blockedReason: string | null } | null,
  onUpgrade: () => void,
  maxedLabel = 'Đã tối đa',
): HTMLElement {
  if (option === null) return createElement('span', { className: 'citadel-muted', text: maxedLabel });
  const button = createButton(option.blockedReason === null ? `${option.label} · ${option.cost}` : option.label, onUpgrade);
  button.disabled = option.blockedReason !== null;
  const reason = option.blockedReason === null ? null : createElement('span', { className: 'citadel-reason', text: option.blockedReason });
  return createElement('div', { className: 'citadel-upgrade' }, [button, reason]);
}

/** Ô tìm cho danh sách từ: tắt tự sửa, tự viết hoa để không đổi chữ tiếng Anh người chơi gõ. */
export function createSearchInput(placeholder: string, label: string, onInput: () => void): HTMLInputElement {
  const input = createElement('input', { className: 'citadel-search' });
  input.type = 'search';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', label);
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.addEventListener('input', onInput);
  return input;
}
