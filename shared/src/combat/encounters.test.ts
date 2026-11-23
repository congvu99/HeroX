import { describe, expect, it } from 'vitest';
import { WORD_CHAINS } from '../data/word-chains.js';
import { ENCOUNTERS, FIELD_ENCOUNTER_ID, findEncounter, scaleEncounterEnemies, TUTORIAL_ENCOUNTER_ID } from './encounters.js';
import { normalizeAnswer } from './answer-matching.js';

describe('encounters', () => {
  it('has unique ids and finds the built-in ones', () => {
    expect(new Set(ENCOUNTERS.map((encounter) => encounter.id)).size).toBe(ENCOUNTERS.length);
    expect(findEncounter(TUTORIAL_ENCOUNTER_ID)?.allowElite).toBe(false);
    expect(findEncounter(FIELD_ENCOUNTER_ID)?.enemies.length).toBeGreaterThan(0);
    expect(findEncounter('nope')).toBeUndefined();
  });

  it('scales enemy HP and attack with the hero level but keeps the reward', () => {
    const field = findEncounter(FIELD_ENCOUNTER_ID);
    if (field === undefined) throw new Error('missing encounter');
    expect(scaleEncounterEnemies(field, 1)[0]).toEqual({ kind: 'imp', maxHp: 40, attack: 12, rewardGold: 8 });
    expect(scaleEncounterEnemies(field, 11)[0]).toEqual({ kind: 'imp', maxHp: 100, attack: 24, rewardGold: 8 });
    expect(scaleEncounterEnemies(field, 0)[0]?.maxHp).toBe(40);
  });
});

describe('WORD_CHAINS', () => {
  it('has chains of 2–4 normalized, distinct words with unique ids', () => {
    expect(WORD_CHAINS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(WORD_CHAINS.map((chain) => chain.id)).size).toBe(WORD_CHAINS.length);
    for (const chain of WORD_CHAINS) {
      expect(chain.words.length).toBeGreaterThanOrEqual(2);
      expect(chain.words.length).toBeLessThanOrEqual(4);
      expect(new Set(chain.words).size).toBe(chain.words.length);
      expect(chain.words.every((word) => normalizeAnswer(word) === word)).toBe(true);
    }
  });
});
