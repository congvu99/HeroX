/**
 * Xử lý riêng cho Safari iOS / PWA: bàn phím ảo che màn, chạm đúp và chụm ngón phóng to trang.
 * Zoom canvas theo kích thước đã có ở `config/display.ts`; game chạy khung dọc nên không có nhắc xoay màn;
 * mở khoá âm thanh do màn trận tự làm ở lần chạm/phím đầu.
 */

/** Biến CSS mang chiều cao bàn phím ảo (px); `index.html` trừ phần này khỏi khung game để đề không bị che. */
export const KEYBOARD_INSET_CSS_VAR = '--keyboard-inset';
/**
 * Phần bị che dưới mức này coi là thanh địa chỉ/thanh công cụ co giãn, không phải bàn phím
 * (bàn phím iPhone ngang thấp nhất khoảng 160px, thanh địa chỉ dưới 100px).
 */
export const KEYBOARD_MIN_INSET_PX = 120;
/** Hai lần chạm cách nhau dưới mức này Safari hiểu là chạm đúp để phóng to. */
export const DOUBLE_TAP_WINDOW_MS = 300;

/**
 * Chiều cao phần layout viewport bị che ở đáy (px), thường là bàn phím ảo.
 * Trả 0 khi phần che nhỏ hơn ngưỡng bàn phím hoặc số đo không hợp lệ.
 */
export function computeKeyboardInset(layoutHeight: number, visualHeight: number, visualOffsetTop: number): number {
  const covered = layoutHeight - visualHeight - visualOffsetTop;
  if (!Number.isFinite(covered) || covered < KEYBOARD_MIN_INSET_PX) return 0;
  return Math.round(covered);
}

/** `true` khi lần chạm này cùng lần trước tạo thành chạm đúp (cần chặn để Safari không phóng to). */
export function isDoubleTap(previousTapMs: number | null, currentTapMs: number): boolean {
  if (previousTapMs === null) return false;
  const gap = currentTapMs - previousTapMs;
  return gap >= 0 && gap < DOUBLE_TAP_WINDOW_MS;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Gắn các xử lý iOS lên `root` (phần tử chứa game): ghi `--keyboard-inset` lên `root`, chặn phóng to.
 * Trả hàm huỷ toàn bộ listener.
 */
export function attachIosViewport(root: HTMLElement): () => void {
  const detachKeyboard = watchKeyboardInset(root);

  // Chặn chạm đúp phóng to; ô nhập được bỏ qua để chạm vẫn đặt con trỏ, chọn chữ bình thường.
  let lastTapMs: number | null = null;
  const handleTouchEnd = (event: TouchEvent): void => {
    if (isEditableTarget(event.target)) return;
    if (isDoubleTap(lastTapMs, event.timeStamp)) event.preventDefault();
    lastTapMs = event.timeStamp;
  };
  // Safari bỏ qua `user-scalable=no`; chặn cử chỉ chụm hai ngón bằng sự kiện riêng của WebKit (không có trong kiểu DOM).
  const handleGestureStart = (event: Event): void => event.preventDefault();
  const listenerOptions: AddEventListenerOptions = { passive: false };
  root.addEventListener('touchend', handleTouchEnd, listenerOptions);
  root.addEventListener('gesturestart', handleGestureStart, listenerOptions);

  return () => {
    detachKeyboard();
    root.removeEventListener('touchend', handleTouchEnd, listenerOptions);
    root.removeEventListener('gesturestart', handleGestureStart, listenerOptions);
  };
}

function watchKeyboardInset(root: HTMLElement): () => void {
  const viewport = window.visualViewport;
  if (viewport === null) return () => undefined;
  let lastInset = -1;
  const update = (): void => {
    const inset = computeKeyboardInset(window.innerHeight, viewport.height, viewport.offsetTop);
    if (inset === lastInset) return;
    lastInset = inset;
    root.style.setProperty(KEYBOARD_INSET_CSS_VAR, `${inset}px`);
  };
  update();
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  return () => {
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
  };
}
