import { MAX_TYPED_ANSWER_LENGTH } from '@herox/shared';

export interface TypingInputHandlers {
  /** Người chơi bấm Enter (hoặc Go/Done trên bàn phím ảo). */
  onSubmit(text: string): void;
}

const PLACEHOLDER = 'Gõ từ tiếng Anh rồi Enter';
const SHAKE_CLASS = 'is-wrong';

/**
 * Ô nhập DOM của màn trận: nhận bàn phím thật và bàn phím ảo iPhone, tắt tự viết hoa, tự sửa, kiểm chính tả để không
 * đổi chữ người chơi gõ. Cỡ chữ ≥ 16px (CSS `battle-typing`) để Safari iOS không tự phóng to trang khi focus.
 */
export class TypingInput {
  readonly element: HTMLInputElement;

  constructor(private readonly handlers: TypingInputHandlers) {
    const element = document.createElement('input');
    element.type = 'text';
    element.className = 'battle-typing';
    element.placeholder = PLACEHOLDER;
    element.maxLength = MAX_TYPED_ANSWER_LENGTH;
    element.autocomplete = 'off';
    element.spellcheck = false;
    element.enterKeyHint = 'go';
    element.setAttribute('autocapitalize', 'off');
    element.setAttribute('autocorrect', 'off');
    element.setAttribute('aria-label', 'Gõ từ tiếng Anh');
    element.addEventListener('keydown', this.handleKeyDown);
    element.addEventListener('animationend', this.handleAnimationEnd);
    this.element = element;
  }

  get text(): string {
    return this.element.value;
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  blur(): void {
    this.element.blur();
  }

  clear(): void {
    this.element.value = '';
  }

  /** Rung ô nhập khi gõ sai. */
  shake(): void {
    this.element.classList.remove(SHAKE_CLASS);
    void this.element.offsetWidth;
    this.element.classList.add(SHAKE_CLASS);
  }

  destroy(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.element.removeEventListener('animationend', this.handleAnimationEnd);
    this.element.remove();
  }

  private readonly handleAnimationEnd = (): void => {
    this.element.classList.remove(SHAKE_CLASS);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Enter trong lúc bộ gõ (Telex, IME) đang ghép chữ là để chốt chữ, không phải để tung chiêu.
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    this.handlers.onSubmit(this.element.value);
  };
}
