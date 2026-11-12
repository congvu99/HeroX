import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeAnswer, TUTORIAL_WORD_IDS, WORD_CHAINS } from '@herox/shared';

// Bộ từ seed của bảng public.words nằm ở repo LingoBrain cạnh HeroX (mặc định ../eng, đổi bằng ENG_REPO_DIR).
const ENG_REPO_DIR = process.env.ENG_REPO_DIR ?? fileURLToPath(new URL('../../../../eng/', import.meta.url));
const DECK_FILE = `${ENG_REPO_DIR.replace(/[\\/]$/, '')}/words.json`;

interface EngDeckFile {
  readonly words: readonly { readonly id: string; readonly word: string }[];
}

describe.skipIf(!existsSync(DECK_FILE))('battle word data against the LingoBrain deck', () => {
  const deck = (JSON.parse(readFileSync(DECK_FILE, 'utf8')) as EngDeckFile).words;

  it('every chapter 1 chain word exists in the deck', () => {
    const words = new Set(deck.map((entry) => normalizeAnswer(entry.word)));
    const missing = WORD_CHAINS.flatMap((chain) => chain.words.filter((word) => !words.has(word)));
    expect(missing).toEqual([]);
  });

  it('every tutorial word id exists in the deck', () => {
    const ids = new Set(deck.map((entry) => entry.id));
    expect(TUTORIAL_WORD_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });
});
