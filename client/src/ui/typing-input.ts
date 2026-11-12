import { MAX_TYPED_ANSWER_LENGTH } from '@herox/shared';

export interface TypingInputHandlers {
  /** Chữ đang gõ thay đổi; màn trận vẽ lại trên canvas. */
  onChange(text: string): void;
  /** Người chơi bấm Enter (hoặc Go/Done trên bàn phím ảo). */
  onSubmit(text: string): void;
}

/**
 * Ô nhập DOM ẩn nằm dưới canvas: nhận bàn phím thật và bàn phím ảo iPhone (canvas không mở được bàn phím ảo),
 * tắt tự viết hoa, tự sửa, kiểm chính tả để không đổi chữ người chơi gõ. Chữ hiển thị do canvas vẽ.
 */
export class TypingInput {
  private readonly element: HTMLInputElement;

  constructor(
    parent: HTMLElement,
    private readonly handlers: TypingInputHandlers,
  ) {
    const element = document.createElement('input');
    element.type = 'text';
    element.maxLength = MAX_TYPED_ANSWER_LENGTH;
    element.autocomplete = 'off';
    element.spellcheck = false;
    element.enterKeyHint = 'go';
    element.setAttribute('autocapitalize', 'off');
    element.setAttribute('autocorrect', 'off');
    element.setAttribute('aria-label', 'Gõ từ tiếng Anh');
    // Trong suốt nhưng vẫn focus được; cỡ chữ 16px để Safari iOS không tự phóng to trang khi focus.
    Object.assign(element.style, {
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      fontSize: '16px',
      border: '0',
      padding: '0',
    });
    element.addEventListener('input', this.handleInput);
    element.addEventListener('keydown', this.handleKeyDown);
    parent.appendChild(element);
    this.element = element;
  }

  get text(): string {
    return this.element.value;
  }

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  blur(): void {
    this.element.blur();
  }

  clear(): void {
    this.element.value = '';
    this.handlers.onChange('');
  }

  destroy(): void {
    this.element.removeEventListener('input', this.handleInput);
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.remove();
  }

  private readonly handleInput = (): void => {
    this.handlers.onChange(this.element.value);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Enter trong lúc bộ gõ (Telex, IME) đang ghép chữ là để chốt chữ, không phải để tung chiêu.
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    this.handlers.onSubmit(this.element.value);
  };
}
