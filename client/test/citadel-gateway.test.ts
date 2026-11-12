import { describe, expect, it, vi } from 'vitest';
import { buildCitadelResponse, CITADEL_REJECTION_MESSAGES, type CitadelResponse } from '@herox/shared';
import { fetchCitadel, sendCitadelAction } from '../src/api/citadel-api';
import { ApiCitadelGateway, DevCitadelGateway } from '../src/citadel/citadel-gateway';
import { devCitadelSeed } from '../src/citadel/dev-citadel-fixture';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function citadelResponse(rowVersion: number, gold = 500): CitadelResponse {
  const seed = devCitadelSeed();
  return buildCitadelResponse({ state: { ...seed.state, rowVersion, gold }, stats: seed.stats, words: seed.words, story: [], today: '2026-11-12' });
}

const UTC_PLUS_7 = 420;

/** Body JSON của lần gọi fetch thứ `index`. */
function sentBody(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>, index: number): unknown {
  const body = fetchImpl.mock.calls[index]?.[1]?.body;
  if (typeof body !== 'string') throw new Error(`Lần gọi ${index} không có body JSON`);
  return JSON.parse(body);
}

describe('citadel-api', () => {
  it('GET kèm utcOffset và Bearer', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, citadelResponse(1)));
    const result = await fetchCitadel('tok', UTC_PLUS_7, fetchImpl);
    expect(result.kind).toBe('ok');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/herox/api/citadel?utcOffset=420');
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
  });

  it('thao tác gửi tới route riêng, body có rowVersion và không có type', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, citadelResponse(4)));
    await sendCitadelAction('tok', { type: 'upgrade', target: { kind: 'skill', skill: 'attack' } }, 3, -300, fetchImpl);
    await sendCitadelAction('tok', { type: 'daily-crystals' }, 4, 0, fetchImpl);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/herox/api/citadel/upgrade?utcOffset=-300',
      '/herox/api/citadel/daily-crystals?utcOffset=0',
    ]);
    expect(fetchImpl.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ rowVersion: 3, target: { kind: 'skill', skill: 'attack' } }));
    expect(fetchImpl.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ rowVersion: 4 }));
  });

  it('409 giữ mã trạng thái để client biết phải tải lại', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(409, { error: 'Thành trì vừa thay đổi' }));
    expect(await sendCitadelAction('tok', { type: 'daily-crystals' }, 1, 0, fetchImpl)).toEqual({
      kind: 'failed',
      message: 'Thành trì vừa thay đổi',
      status: 409,
    });
  });
});

describe('ApiCitadelGateway', () => {
  function gateway(fetchImpl: typeof fetch): ApiCitadelGateway {
    return new ApiCitadelGateway({ token: 'tok', fetchImpl, utcOffsetMinutes: () => UTC_PLUS_7 });
  }

  it('gửi kèm rowVersion của lần đọc gần nhất', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(7)))
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(8)))
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(9)));
    const citadel = gateway(fetchImpl);
    await citadel.load();
    await citadel.send({ type: 'outfit', outfitId: 'default' });
    await citadel.send({ type: 'outfit', outfitId: 'default' });
    expect([sentBody(fetchImpl, 1), sentBody(fetchImpl, 2)]).toEqual([
      { rowVersion: 7, outfitId: 'default' },
      { rowVersion: 8, outfitId: 'default' },
    ]);
  });

  it('chưa đọc lần nào thì đọc trước rồi mới gửi', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(2)))
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(3)));
    const result = await gateway(fetchImpl).send({ type: 'daily-crystals' });
    expect(result.kind).toBe('ok');
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('GET');
    expect(sentBody(fetchImpl, 1)).toEqual({ rowVersion: 2 });
  });

  it('409 thì tự tải lại, trả bản mới kèm câu báo của server', async () => {
    const fresh = citadelResponse(12, 80);
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(10)))
      .mockResolvedValueOnce(jsonResponse(409, { error: 'Thành trì vừa thay đổi ở nơi khác, đã tải lại' }))
      .mockResolvedValueOnce(jsonResponse(200, fresh))
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(13)));
    const citadel = gateway(fetchImpl);
    await citadel.load();
    expect(await citadel.send({ type: 'upgrade', target: { kind: 'forge' } })).toEqual({
      kind: 'reloaded',
      response: fresh,
      message: 'Thành trì vừa thay đổi ở nơi khác, đã tải lại',
    });
    // Lần gửi sau dùng version của bản vừa tải lại.
    await citadel.send({ type: 'upgrade', target: { kind: 'forge' } });
    expect(sentBody(fetchImpl, 3)).toMatchObject({ rowVersion: 12 });
  });

  it('server từ chối (422) thì báo lý do, hết phiên thì báo đăng nhập lại', async () => {
    const rejected = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, citadelResponse(1)))
      .mockResolvedValueOnce(jsonResponse(422, { error: CITADEL_REJECTION_MESSAGES['not-enough-gold'] }));
    const citadel = gateway(rejected);
    await citadel.load();
    expect(await citadel.send({ type: 'upgrade', target: { kind: 'forge' } })).toEqual({
      kind: 'failed',
      message: CITADEL_REJECTION_MESSAGES['not-enough-gold'],
    });
    const expired = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(401, {}));
    expect(await gateway(expired).load()).toEqual({ kind: 'unauthenticated' });
  });
});

describe('DevCitadelGateway', () => {
  it('chạy luật thành trì cục bộ: trừ vàng, tăng version, chặn nhận pha lê lần hai trong ngày', async () => {
    const citadel = new DevCitadelGateway(devCitadelSeed(), () => Date.UTC(2026, 10, 12, 5));
    const forged = await citadel.send({ type: 'upgrade', target: { kind: 'item', itemId: 'pilgrim-sword' } });
    if (forged.kind !== 'ok') throw new Error(`Rèn thử thất bại: ${forged.kind}`);
    expect(forged.response.state).toMatchObject({ rowVersion: 2, gold: devCitadelSeed().state.gold - 40 });
    expect(forged.response.state.inventory).toEqual([{ itemId: 'pilgrim-sword', level: 1, equipped: true }]);

    expect((await citadel.send({ type: 'daily-crystals' })).kind).toBe('ok');
    expect(await citadel.send({ type: 'daily-crystals' })).toEqual({ kind: 'failed', message: CITADEL_REJECTION_MESSAGES['already-claimed'] });
  });
});
