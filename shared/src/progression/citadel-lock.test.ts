import { describe, expect, it } from 'vitest';
import type { CitadelState } from '../citadel-contract.js';
import { BASE_SKILL_TIERS } from '../data/skill-catalog.js';
import { applyCitadelAction, type CitadelActionContext } from './citadel-rules.js';

const STATE: CitadelState = {
  rowVersion: 1,
  gold: 10_000,
  crystals: 100,
  outfit: 'default',
  forgeLevel: 1,
  skillTiers: BASE_SKILL_TIERS,
  inventory: [],
  loadout: [],
  lastCrystalClaimDay: null,
};

const CONTEXT: CitadelActionContext = {
  stats: { learned: 500, mastered: 100, streakDays: 3, retention30: 0.9, byPos: { verb: 0, noun: 0, adj: 0, adv: 0, prep: 0, other: 0 } },
  today: '2026-11-12',
  learnedWordIds: new Set(),
};

describe('story-locked forge', () => {
  it('rejects forge and item upgrades while the forge is locked, other actions still work', () => {
    const locked = { ...CONTEXT, lockedBuildings: new Set(['forge']) };
    expect(applyCitadelAction(STATE, locked, { type: 'upgrade', target: { kind: 'forge' } })).toEqual({ ok: false, reason: 'building-locked' });
    expect(applyCitadelAction(STATE, locked, { type: 'upgrade', target: { kind: 'item', itemId: 'x' } })).toEqual({ ok: false, reason: 'building-locked' });
    expect(applyCitadelAction(STATE, locked, { type: 'upgrade', target: { kind: 'skill', skill: 'attack' } })).toMatchObject({ ok: true });
  });

  it('rejects equipping while the forge is locked', () => {
    // Trang bị cũng làm ở lò rèn: lò rèn khoá thì chặn, tránh lách khoá bằng equip.
    const locked = { ...CONTEXT, lockedBuildings: new Set(['forge']) };
    expect(applyCitadelAction(STATE, locked, { type: 'equip', itemId: 'x' })).toEqual({ ok: false, reason: 'building-locked' });
  });

  it('allows forge work once unlocked or when no lock is given', () => {
    expect(applyCitadelAction(STATE, CONTEXT, { type: 'upgrade', target: { kind: 'forge' } })).toMatchObject({ ok: true });
    expect(applyCitadelAction(STATE, { ...CONTEXT, lockedBuildings: new Set() }, { type: 'upgrade', target: { kind: 'forge' } })).toMatchObject({ ok: true });
  });
});
