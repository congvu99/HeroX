import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ENG_SESSION_IDLE_DAYS, hashSessionToken, parseBearerToken } from '../auth/eng-session.js';
import { readFixture } from '../../test/read-fixture.js';
import { computeLearningStats, type DeckWord } from './learning-stats.js';

// Test hợp đồng với repo LingoBrain đặt cạnh HeroX (mặc định ../eng); không có repo thì bỏ qua.
// Đổi vị trí bằng biến môi trường ENG_REPO_DIR.
const ENG_REPO_DIR = process.env.ENG_REPO_DIR ?? fileURLToPath(new URL('../../../../eng/', import.meta.url));
const engFile = (relativePath: string) => `${ENG_REPO_DIR.replace(/[\\/]$/, '')}/${relativePath}`;
const hasEngRepo = existsSync(engFile('js/sync-merge.js'));

// 2026-11-12 05:00 UTC, cùng mốc với fixture tiến độ.
const NOW = Date.UTC(2026, 10, 12, 5, 0, 0);
// Hợp đồng payload v1 HeroX đang đọc; LingoBrain thêm/bớt khoá → test fail để rà lại learning-stats.
const KNOWN_PAYLOAD_KEYS = ['boss', 'cfg', 'day', 'gameScore', 'plan', 'srs', 'srsEpoch', 'v'];
const KNOWN_RECORD_KEYS = ['ef', 'hist', 'ivl', 'due', 'state', 'reps', 'lapses', 'last', 'lastMode', 'sentences'];

interface EngSyncMerge {
  sanitizePayload(payload: unknown, now: number): Record<string, unknown> & { srs: Record<string, Record<string, unknown>> };
  mergeSync(a: unknown, b: unknown, options?: { histMax: number }): Record<string, unknown> & { srs: Record<string, EngRecord> };
}
interface EngRecord {
  state: string;
  ivl: number;
}
interface EngScheduler {
  deckSummary(deck: { words: readonly DeckWord[] }, srs: Record<string, EngRecord>, now: number): { mature: number; learn: number };
}
interface EngStats {
  computeStats(
    deck: { words: readonly DeckWord[] },
    srs: Record<string, EngRecord>,
    now: number,
  ): { total: number; retention30: { rate: number | null }; hardest: { id: string; lapses: number }[] };
}
interface EngHashing {
  hashToken(token: string): string;
}

describe.skipIf(!hasEngRepo)('contract with the LingoBrain repository', () => {
  const requireEng = createRequire(engFile('package.json'));
  const syncMerge = requireEng('./js/sync-merge.js') as EngSyncMerge;
  const scheduler = requireEng('./js/srs-scheduler.js') as EngScheduler;
  const stats = requireEng('./js/stats-dashboard.js') as EngStats;
  const hashing = requireEng('./server/password-hashing-and-session-tokens.js') as EngHashing;
  const deck = { words: readFixture<DeckWord[]>('deck-words.json') };

  // Dựng payload đúng như server LingoBrain lưu: làm sạch rồi gộp (eng/server/auth-and-sync-routes.js sync).
  const storedPayload = (fixtureName: string) =>
    syncMerge.mergeSync(syncMerge.sanitizePayload({ v: 1 }, NOW), syncMerge.sanitizePayload(readFixture(fixtureName), NOW), {
      histMax: 20,
    });

  it('keeps the payload shape HeroX reads', () => {
    const payload = storedPayload('progress-all-states.json');
    expect(Object.keys(payload).sort()).toEqual(KNOWN_PAYLOAD_KEYS);
    expect(payload.v).toBe(1);
    const record = syncMerge.sanitizePayload(readFixture('progress-all-states.json'), NOW).srs['w-run'];
    expect(Object.keys(record ?? {}).sort()).toEqual([...KNOWN_RECORD_KEYS].sort());
  });

  it.each(['progress-empty.json', 'progress-all-states.json', 'progress-with-epoch.json', 'progress-removed-words.json'])(
    'matches the LingoBrain progress tab for %s',
    (fixtureName) => {
      const payload = storedPayload(fixtureName);
      const engStats = stats.computeStats(deck, payload.srs, NOW);
      const engSummary = scheduler.deckSummary(deck, payload.srs, NOW);
      const ours = computeLearningStats(payload, deck.words, NOW);

      expect(ours.learned).toBe(engStats.total);
      expect(ours.learned).toBe(engSummary.learn + engSummary.mature);
      expect(ours.mastered).toBe(engSummary.mature);
      expect(ours.retention30).toBe(engStats.retention30.rate);
      const engLapsed = engStats.hardest.filter((word) => word.lapses > 0).map((word) => word.id);
      expect(ours.weakWords.slice(0, engLapsed.length).map((word) => word.id)).toEqual(engLapsed);
    },
  );

  it('hashes session tokens exactly like LingoBrain', () => {
    for (const token of ['abc', 'Zm9vYmFyYmF6cXV4LXRva2VuX3ZhbHVl', 'a'.repeat(200)]) {
      expect(hashSessionToken(token)).toBe(hashing.hashToken(token));
    }
  });

  it('uses the same bearer token format and session lifetime', () => {
    const authSource = readFileSync(engFile('server/auth-and-sync-routes.js'), 'utf8');
    expect(authSource).toContain('/^Bearer ([A-Za-z0-9_-]{20,200})$/');
    expect(authSource).toMatch(new RegExp(`SESSION_DAYS = ${ENG_SESSION_IDLE_DAYS}\\b`));
    expect(authSource).toContain('cred.hashToken(m[1])');
    expect(parseBearerToken('Bearer ' + 'x'.repeat(20))).not.toBeNull();
  });
});
