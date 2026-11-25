import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { WordResult } from '@herox/shared';
import { loadMigrations, runMigrations } from '../db/migrate.js';
import { EmbeddedPostgres } from '../../test/embedded-postgres.js';
import { PgBattleRepository, type BattleSettlement } from './battle-repository.js';

const USER_ID = 1;
const SETTLED_MS = Date.UTC(2026, 10, 25, 5, 0, 0);

function wordResult(overrides: Partial<WordResult> = {}): WordResult {
  return { prompted: 1, trailingCorrect: 1, missed: false, ...overrides };
}

function settlement(overrides: Partial<BattleSettlement> = {}): BattleSettlement {
  return {
    userId: USER_ID,
    battleId: 'battle-1',
    goldEarned: 0,
    misses: new Map(),
    wordResults: new Map(),
    settledAtMs: SETTLED_MS,
    wonEncounterId: null,
    ...overrides,
  };
}

describe('PgBattleRepository word exposures', () => {
  let db: EmbeddedPostgres;
  let repository: PgBattleRepository;

  beforeAll(async () => {
    db = await EmbeddedPostgres.create();
    await runMigrations(db, await loadMigrations());
    repository = new PgBattleRepository(db);
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.exec('DELETE FROM herox.heroes');
    await db.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES ($1, 'Knight', 'male')", [USER_ID]);
  });

  it('inserts then accumulates seen count and correct streak', async () => {
    await repository!.settleBattle(settlement({ battleId: 'b1', wordResults: new Map([['w1', wordResult({ prompted: 2, trailingCorrect: 2 })]]) }));
    await repository!.settleBattle(settlement({ battleId: 'b2', wordResults: new Map([['w1', wordResult({ prompted: 3, trailingCorrect: 1 })]]) }));
    const exposures = await repository!.readWordExposures(USER_ID);
    expect(exposures.get('w1')).toEqual({ correctStreak: 3, lastSeenAtMs: SETTLED_MS });
  });

  it('resets the correct streak when the word was missed', async () => {
    await repository!.settleBattle(settlement({ battleId: 'b1', wordResults: new Map([['w1', wordResult({ trailingCorrect: 5 })]]) }));
    // Trận sau sai từ w1, nhưng cuối trận đã gỡ lại 1 lần đúng → streak đặt lại = 1, không cộng dồn.
    await repository!.settleBattle(settlement({ battleId: 'b2', wordResults: new Map([['w1', wordResult({ prompted: 2, trailingCorrect: 1, missed: true })]]) }));
    const exposures = await repository!.readWordExposures(USER_ID);
    expect(exposures.get('w1')?.correctStreak).toBe(1);
  });

  it('does not write twice when the same battle is settled again', async () => {
    const first = await repository!.settleBattle(settlement({ battleId: 'b1', wordResults: new Map([['w1', wordResult({ prompted: 2 })]]) }));
    const second = await repository!.settleBattle(settlement({ battleId: 'b1', wordResults: new Map([['w1', wordResult({ prompted: 2 })]]) }));
    expect(first).toBe(true);
    expect(second).toBe(false);
    const result = await db.query<{ seen_count: number }>('SELECT seen_count FROM herox.word_exposures WHERE user_id = $1 AND word_id = $2', [USER_ID, 'w1']);
    expect(result.rows[0]?.seen_count).toBe(2);
  });
});
