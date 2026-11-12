import { describe, expect, it } from 'vitest';
import { normalizePartOfSpeech } from './part-of-speech.js';

describe('normalizePartOfSpeech', () => {
  it.each([
    ['verb', 'verb'],
    ['v', 'verb'],
    ['v.', 'verb'],
    ['phrasal verb', 'verb'],
    ['verb, noun', 'verb'],
    ['modal verb', 'verb'],
    ['noun', 'noun'],
    ['n', 'noun'],
    ['noun, verb', 'noun'],
    ['Adjective', 'adj'],
    ['adj', 'adj'],
    ['adjective, adverb', 'adj'],
    ['adverb, preposition', 'adv'],
    ['preposition', 'prep'],
    ['phrase', 'other'],
    ['discourse marker', 'other'],
    ['infinitive marker, preposition', 'other'],
    ['', 'other'],
  ])('maps %j to %s', (pos, expected) => {
    expect(normalizePartOfSpeech(pos)).toBe(expected);
  });
});
