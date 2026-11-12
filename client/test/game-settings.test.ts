import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  otherInputMode,
  resolveInputMode,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from '../src/config/game-settings';

function memoryStorage(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(SETTINGS_STORAGE_KEY, initial);
  return {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, value);
    },
  };
}

function blockedStorage(): never {
  throw new DOMException('blocked', 'SecurityError');
}

describe('game settings', () => {
  it('mặc định theo thiết bị: cảm ứng dùng vòng từ, bàn phím dùng gõ', () => {
    expect(resolveInputMode(DEFAULT_SETTINGS, true)).toBe('ring');
    expect(resolveInputMode(DEFAULT_SETTINGS, false)).toBe('typing');
  });

  it('người chơi đã chọn thì giữ lựa chọn bất kể thiết bị', () => {
    expect(resolveInputMode({ inputMode: 'typing', soundEnabled: true }, true)).toBe('typing');
    expect(otherInputMode('typing')).toBe('ring');
    expect(otherInputMode('ring')).toBe('typing');
  });

  it('lưu rồi đọc lại', () => {
    const storage = memoryStorage();
    saveSettings(() => storage, { inputMode: 'ring', soundEnabled: false });
    expect(loadSettings(() => storage)).toEqual({ inputMode: 'ring', soundEnabled: false });
  });

  it('JSON hỏng, giá trị lạ hoặc storage bị chặn thì dùng mặc định', () => {
    expect(loadSettings(() => memoryStorage('{oops'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(() => memoryStorage('{"inputMode":"voice","soundEnabled":"yes"}'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(blockedStorage)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(blockedStorage, DEFAULT_SETTINGS)).not.toThrow();
  });
});
