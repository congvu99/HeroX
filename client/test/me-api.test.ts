import { describe, expect, it, vi } from 'vitest';
import {
  currentUtcOffsetMinutes,
  ENG_AUTH_STORAGE_KEY,
  fetchMe,
  readEngSessionToken,
} from '../src/api/me-api';

function storageWith(value: string | null) {
  return () => ({ getItem: (key: string) => (key === ENG_AUTH_STORAGE_KEY ? value : null) });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('readEngSessionToken', () => {
  it('đọc token phiên LingoBrain', () => {
    expect(readEngSessionToken(storageWith('{"token":"abc","username":"u"}'))).toBe('abc');
  });

  it('thiếu, rỗng hoặc JSON hỏng coi như chưa đăng nhập', () => {
    expect(readEngSessionToken(storageWith(null))).toBeNull();
    expect(readEngSessionToken(storageWith('{"token":""}'))).toBeNull();
    expect(readEngSessionToken(storageWith('{not json'))).toBeNull();
    expect(readEngSessionToken(storageWith('"chuỗi"'))).toBeNull();
  });

  it('trình duyệt chặn storage (SecurityError) coi như chưa đăng nhập', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    expect(readEngSessionToken(blocked)).toBeNull();
  });
});

describe('fetchMe', () => {
  it('không có token thì không gọi mạng', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(fetchMe(null, fetchImpl, 420)).resolves.toEqual({ kind: 'unauthenticated' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('gửi Bearer token và utcOffset', async () => {
    const me = { user: { id: 1, username: 'u' }, learning: {}, hero: null };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, me));
    await expect(fetchMe('tok', fetchImpl, -300)).resolves.toEqual({ kind: 'ok', me });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/herox/api/me?utcOffset=-300');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
  });

  it('401 → chưa đăng nhập; 503 → máy chủ chưa sẵn sàng kèm lời báo của server', async () => {
    await expect(fetchMe('tok', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(401, { error: 'x' })), 0)).resolves.toEqual({
      kind: 'unauthenticated',
    });
    await expect(
      fetchMe('tok', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(503, { error: 'Đang khởi động' })), 0),
    ).resolves.toEqual({ kind: 'unavailable', message: 'Đang khởi động' });
  });

  it('200 nhưng body không phải JSON hoặc sai hình dạng → chưa sẵn sàng, không ném lỗi', async () => {
    const html = new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    await expect(fetchMe('tok', vi.fn<typeof fetch>().mockResolvedValue(html), 0)).resolves.toMatchObject({ kind: 'unavailable' });
    await expect(fetchMe('tok', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: true })), 0)).resolves.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('gắn timeout để mạng treo không kẹt màn chờ; hết hạn quy về chưa sẵn sàng', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    await expect(fetchMe('tok', fetchImpl, 0)).resolves.toMatchObject({ kind: 'unavailable' });
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('lỗi mạng không ném ra ngoài', async () => {
    const result = await fetchMe('tok', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')), 0);
    expect(result.kind).toBe('unavailable');
  });
});

describe('currentUtcOffsetMinutes', () => {
  it('đổi dấu getTimezoneOffset (phút về phía đông UTC)', () => {
    const date = { getTimezoneOffset: () => -420 } as Date;
    expect(currentUtcOffsetMinutes(date)).toBe(420);
  });
});
