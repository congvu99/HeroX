import { describe, expect, it, vi } from 'vitest';
import {
  currentUtcOffsetMinutes,
  ENG_AUTH_STORAGE_KEY,
  ENG_SESSION_POLL_MS,
  fetchMe,
  readEngSessionToken,
  waitForEngSession,
  type EngSessionWatchEnv,
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

describe('waitForEngSession', () => {
  function fakeEnv(authValue: { value: string | null }) {
    let storageHandler: (() => void) | null = null;
    let pollHandler: (() => void) | null = null;
    const env: EngSessionWatchEnv = {
      getStorage: () => ({ getItem: (key) => (key === ENG_AUTH_STORAGE_KEY ? authValue.value : null) }),
      addStorageListener: (handler) => {
        storageHandler = handler;
      },
      removeStorageListener: vi.fn(),
      setPoll: (handler) => {
        pollHandler = handler;
        return 7;
      },
      clearPoll: vi.fn(),
    };
    return {
      env,
      fireStorage: () => storageHandler?.(),
      firePoll: () => pollHandler?.(),
    };
  }

  it('dùng nhịp dò 1 giây và gọi onToken khi storage event mang token mới', () => {
    const auth = { value: null as string | null };
    const onToken = vi.fn();
    const { env, fireStorage } = fakeEnv(auth);
    const setPoll = vi.spyOn(env, 'setPoll');

    waitForEngSession(env, onToken);
    expect(setPoll.mock.calls[0]?.[1]).toBe(ENG_SESSION_POLL_MS);

    fireStorage();
    expect(onToken).not.toHaveBeenCalled(); // chưa có token

    auth.value = '{"token":"abc","username":"u"}';
    fireStorage();
    expect(onToken).toHaveBeenCalledExactlyOnceWith('abc');
  });

  it('nhịp dò dự phòng cũng phát hiện token khi không có storage event', () => {
    const auth = { value: null as string | null };
    const onToken = vi.fn();
    const { env, firePoll } = fakeEnv(auth);

    waitForEngSession(env, onToken);
    auth.value = '{"token":"xyz","username":"u"}';
    firePoll();
    expect(onToken).toHaveBeenCalledExactlyOnceWith('xyz');
  });

  it('gọi onToken đúng một lần rồi gỡ listener và nhịp dò', () => {
    const auth = { value: '{"token":"t","username":"u"}' };
    const onToken = vi.fn();
    const { env, fireStorage, firePoll } = fakeEnv(auth);

    waitForEngSession(env, onToken);
    fireStorage();
    firePoll();
    expect(onToken).toHaveBeenCalledTimes(1);
    expect(env.removeStorageListener).toHaveBeenCalledOnce();
    expect(env.clearPoll).toHaveBeenCalledWith(7);
  });

  it('hàm hủy gỡ listener và nhịp dò, sau đó không gọi onToken nữa', () => {
    const auth = { value: null as string | null };
    const onToken = vi.fn();
    const { env, fireStorage } = fakeEnv(auth);

    const stop = waitForEngSession(env, onToken);
    stop();
    expect(env.removeStorageListener).toHaveBeenCalledOnce();
    expect(env.clearPoll).toHaveBeenCalledWith(7);

    auth.value = '{"token":"t"}';
    fireStorage();
    expect(onToken).not.toHaveBeenCalled();
  });
});

describe('currentUtcOffsetMinutes', () => {
  it('đổi dấu getTimezoneOffset (phút về phía đông UTC)', () => {
    const date = { getTimezoneOffset: () => -420 } as Date;
    expect(currentUtcOffsetMinutes(date)).toBe(420);
  });
});
