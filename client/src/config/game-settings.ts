/** Cài đặt người chơi lưu trên máy (không lên server): kiểu nhập trong trận và âm thanh. */
export const BATTLE_INPUT_MODES = ['typing', 'ring'] as const;
export type BattleInputMode = (typeof BATTLE_INPUT_MODES)[number];

export interface GameSettings {
  /** `null`: theo thiết bị (cảm ứng → vòng từ, bàn phím → gõ). */
  readonly inputMode: BattleInputMode | null;
  readonly soundEnabled: boolean;
}

export const SETTINGS_STORAGE_KEY = 'herox.settings.v1';
export const DEFAULT_SETTINGS: GameSettings = { inputMode: null, soundEnabled: true };

interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isInputMode(value: unknown): value is BattleInputMode {
  return typeof value === 'string' && (BATTLE_INPUT_MODES as readonly string[]).includes(value);
}

/** Đọc cài đặt; JSON hỏng hoặc trình duyệt chặn storage thì dùng mặc định. */
export function loadSettings(getStorage: () => SettingsStorage): GameSettings {
  try {
    const raw = getStorage().getItem(SETTINGS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;
    const { inputMode, soundEnabled } = parsed as Partial<Record<keyof GameSettings, unknown>>;
    return {
      inputMode: isInputMode(inputMode) ? inputMode : DEFAULT_SETTINGS.inputMode,
      soundEnabled: typeof soundEnabled === 'boolean' ? soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Lưu cài đặt; storage bị chặn (Safari riêng tư) thì chỉ giữ trong phiên, không báo lỗi. */
export function saveSettings(getStorage: () => SettingsStorage, settings: GameSettings): void {
  try {
    getStorage().setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Không lưu được thì cài đặt chỉ sống tới khi tải lại trang; game vẫn chơi bình thường.
  }
}

/** Kiểu nhập dùng thật: người chơi đã chọn thì theo đó, chưa chọn thì cảm ứng dùng vòng từ. */
export function resolveInputMode(settings: GameSettings, touchPrimary: boolean): BattleInputMode {
  return settings.inputMode ?? (touchPrimary ? 'ring' : 'typing');
}

export function otherInputMode(mode: BattleInputMode): BattleInputMode {
  return mode === 'typing' ? 'ring' : 'typing';
}
