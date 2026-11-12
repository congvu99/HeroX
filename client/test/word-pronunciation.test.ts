import { describe, expect, it, vi } from 'vitest';
import { fetchPronunciation, TTS_DISABLED_MESSAGE, TTS_FAILED_MESSAGE } from '../src/audio/word-pronunciation';

describe('fetchPronunciation', () => {
  it('gọi /api/tts của LingoBrain với header bắt buộc', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Blob(['mp3']), { status: 200 }));
    const result = await fetchPronunciation(' run away ', fetchImpl);
    expect(result.kind).toBe('audio');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/api/tts?text=run%20away');
    expect(new Headers(init?.headers).get('X-LB-TTS')).toBe('1');
  });

  it('TTS tắt (501), lỗi khác hay mất mạng đều trả câu báo, không ném lỗi', async () => {
    const disabled = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 501 }));
    expect(await fetchPronunciation('run', disabled)).toEqual({ kind: 'unavailable', message: TTS_DISABLED_MESSAGE });
    const limited = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429 }));
    expect(await fetchPronunciation('run', limited)).toEqual({ kind: 'unavailable', message: TTS_FAILED_MESSAGE });
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    expect(await fetchPronunciation('run', offline)).toEqual({ kind: 'unavailable', message: TTS_FAILED_MESSAGE });
  });
});
