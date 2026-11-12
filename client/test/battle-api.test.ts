import { describe, expect, it, vi } from 'vitest';
import { startBattle, submitBattleResult } from '../src/api/battle-api';
import { devBattleSetup } from '../src/battle/dev-battle-fixture';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const BATTLE_ID = '11111111-2222-3333-4444-555555555555';

describe('startBattle', () => {
  it('gửi encounterId kèm Bearer, trả setup', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(201, { battleId: BATTLE_ID, setup: devBattleSetup(), tutorial: false }));
    const result = await startBattle('tok', { encounterId: 'ch1-field' }, fetchImpl);
    expect(result.kind).toBe('ok');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/herox/api/battles');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
    expect(init?.body).toBe(JSON.stringify({ encounterId: 'ch1-field' }));
  });

  it('401 → hết phiên; lỗi server → thông báo của server; body lạ → lỗi chung', async () => {
    expect((await startBattle('tok', { encounterId: 'x' }, vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(401, {})))).kind).toBe('unauthenticated');
    const conflict = await startBattle('tok', { encounterId: 'x' }, vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(409, { error: 'Cần tạo nhân vật' })));
    expect(conflict).toEqual({ kind: 'failed', message: 'Cần tạo nhân vật', status: 409 });
    const odd = await startBattle('tok', { encounterId: 'x' }, vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(201, { ok: true })));
    expect(odd.kind).toBe('failed');
  });

  it('mất mạng không ném lỗi', async () => {
    const result = await startBattle('tok', { encounterId: 'x' }, vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline')));
    expect(result.kind).toBe('failed');
  });
});

describe('submitBattleResult', () => {
  it('gửi log tới đúng trận, trả kết quả server chạy lại', async () => {
    const body = { outcome: 'victory', goldEarned: 28, missedWordIds: [] };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, body));
    const result = await submitBattleResult('tok', BATTLE_ID, { entries: [{ atMs: 300, kind: 'type', text: 'run' }], endedAtMs: 900 }, fetchImpl);
    expect(result).toEqual({ kind: 'ok', value: body });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`/herox/api/battles/${BATTLE_ID}/result`);
  });

  it('kết quả thiếu danh sách từ sai bị coi là lỗi', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { outcome: 'victory', goldEarned: 28 }));
    const result = await submitBattleResult('tok', BATTLE_ID, { entries: [], endedAtMs: 900 }, fetchImpl);
    expect(result.kind).toBe('failed');
  });
});
