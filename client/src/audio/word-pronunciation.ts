import { unlockAudioContext } from './audio-unlock';

/** Route phát âm của LingoBrain (cùng origin); HeroX chỉ đọc, không đổi gì phía LingoBrain. */
export const ENG_TTS_PATH = '/api/tts';
/** LingoBrain chặn request thiếu header này để thẻ `<audio>` ở trang khác không gọi lậu được. */
const TTS_HEADER = { 'X-LB-TTS': '1' } as const;
const HTTP_NOT_IMPLEMENTED = 501;
/** Mạng chậm thì bỏ, người chơi bấm lại sau; khớp mức chờ LingoBrain dùng cho cùng route. */
const TTS_TIMEOUT_MS = 6_000;

export const TTS_DISABLED_MESSAGE = 'Máy chủ LingoBrain chưa bật phát âm';
export const TTS_FAILED_MESSAGE = 'Chưa phát âm được, thử lại sau';

export type PronunciationResult =
  | { readonly kind: 'audio'; readonly audio: Blob }
  | { readonly kind: 'unavailable'; readonly message: string };

export function pronunciationUrl(text: string): string {
  return `${ENG_TTS_PATH}?text=${encodeURIComponent(text.trim())}`;
}

/** Lấy file MP3 phát âm một từ; TTS tắt (501) hay lỗi đều trả câu báo nhẹ, không ném lỗi. */
export async function fetchPronunciation(text: string, fetchImpl: typeof fetch): Promise<PronunciationResult> {
  try {
    const response = await fetchImpl(pronunciationUrl(text), { headers: TTS_HEADER, signal: AbortSignal.timeout(TTS_TIMEOUT_MS) });
    if (response.status === HTTP_NOT_IMPLEMENTED) return { kind: 'unavailable', message: TTS_DISABLED_MESSAGE };
    if (!response.ok) return { kind: 'unavailable', message: TTS_FAILED_MESSAGE };
    return { kind: 'audio', audio: await response.blob() };
  } catch {
    return { kind: 'unavailable', message: TTS_FAILED_MESSAGE };
  }
}

/**
 * Phát âm bằng Web Audio. `unlock` gọi đồng bộ trong handler chạm (trước khi chờ mạng) để Safari iOS cho phát;
 * phát từ mới thì dừng âm cũ để không chồng tiếng.
 */
export class PronunciationPlayer {
  private context: AudioContext | null = null;
  private current: AudioBufferSourceNode | null = null;

  unlock(): void {
    this.context = unlockAudioContext(this.context);
  }

  async play(audio: Blob): Promise<boolean> {
    const context = this.context;
    if (context === null) return false;
    try {
      const buffer = await context.decodeAudioData(await audio.arrayBuffer());
      this.current?.stop();
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
      this.current = source;
      return true;
    } catch {
      // Dữ liệu không phải âm thanh giải mã được (proxy trả HTML, file hỏng).
      return false;
    }
  }

  /** iOS giới hạn số AudioContext đang mở: đóng khi rời thư viện. */
  dispose(): void {
    this.current?.stop();
    this.context?.close().catch(() => undefined);
    this.context = null;
    this.current = null;
  }
}
