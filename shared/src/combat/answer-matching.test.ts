import { describe, expect, it } from 'vitest';
import { levenshteinDistance, matchAnswer, normalizeAnswer } from './answer-matching.js';

describe('normalizeAnswer', () => {
  it.each([
    ['  Run! ', 'run'],
    ['Give   UP', 'give up'],
    ['well-known', 'well known'],
    ['don’t', "don't"],
    ['café', 'caf'],
    ['', ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeAnswer(input)).toBe(expected);
  });
});

describe('levenshteinDistance', () => {
  it.each([
    ['', '', 0],
    ['abc', '', 3],
    ['', 'abc', 3],
    ['quickly', 'quickly', 0],
    ['quikly', 'quickly', 1],
    ['quickyl', 'quickly', 2],
    ['kitten', 'sitting', 3],
  ])('distance(%j, %j) = %i', (source, target, expected) => {
    expect(levenshteinDistance(source, target)).toBe(expected);
  });
});

describe('matchAnswer', () => {
  it.each([
    ['run', 'run', 'exact'],
    ['RUN.', 'run', 'exact'],
    ['give up', 'give up', 'exact'],
    // Từ ≥ 5 ký tự được lệch 1 ký tự.
    ['quikly', 'quickly', 'near'],
    ['strng', 'strong', 'near'],
    ['give upp', 'give up', 'wrong'],
    ['brave', 'brave', 'exact'],
    // Từ ngắn hơn 5 ký tự phải đúng hẳn.
    ['rnu', 'run', 'wrong'],
    ['awy', 'away', 'wrong'],
    ['quickyl', 'quickly', 'wrong'],
    ['give', 'give up', 'wrong'],
    ['', 'run', 'wrong'],
    ['!!!', 'run', 'wrong'],
    ["don’t", "don't", 'exact'],
  ])('matchAnswer(%j, %j) = %s', (answer, target, expected) => {
    expect(matchAnswer(answer, target)).toBe(expected);
  });
});
