import { describe, expect, it } from 'vitest';
import {
  computeKeyboardInset,
  DOUBLE_TAP_WINDOW_MS,
  isDoubleTap,
  KEYBOARD_MIN_INSET_PX,
} from '../src/platform/ios-viewport';

describe('computeKeyboardInset', () => {
  it('trả chiều cao bàn phím khi visual viewport bị che ở đáy', () => {
    // iPhone 12 ngang: layout 390px, bàn phím chiếm ~200px.
    expect(computeKeyboardInset(390, 190, 0)).toBe(200);
  });

  it('trừ phần Safari cuộn trang lên khi bàn phím mở', () => {
    expect(computeKeyboardInset(844, 450, 50)).toBe(344);
  });

  it('phần che nhỏ (thanh địa chỉ co giãn) không tính là bàn phím', () => {
    expect(computeKeyboardInset(844, 844 - KEYBOARD_MIN_INSET_PX + 1, 0)).toBe(0);
    expect(computeKeyboardInset(844, 844, 0)).toBe(0);
  });

  it('số đo hỏng trả 0', () => {
    expect(computeKeyboardInset(Number.NaN, 300, 0)).toBe(0);
  });
});

describe('isDoubleTap', () => {
  it('lần chạm đầu không phải chạm đúp', () => {
    expect(isDoubleTap(null, 1000)).toBe(false);
  });

  it('hai lần chạm sát nhau là chạm đúp, cách xa thì không', () => {
    expect(isDoubleTap(1000, 1000 + DOUBLE_TAP_WINDOW_MS - 1)).toBe(true);
    expect(isDoubleTap(1000, 1000 + DOUBLE_TAP_WINDOW_MS)).toBe(false);
  });

  it('dấu thời gian lùi (đồng hồ khác nguồn) không bị coi là chạm đúp', () => {
    expect(isDoubleTap(1000, 900)).toBe(false);
  });
});
