import { describe, expect, it } from 'vitest';
import { HttpError } from '../http/http-error.js';
import { authenticate, hashSessionToken, parseBearerToken, type SessionLookup } from './eng-session.js';

const VALID_TOKEN = 'abcdefghijklmnopqrstuvwxyz_-0123456789';

function lookupReturning(user: { userId: number; username: string } | null): SessionLookup & { hashes: string[] } {
  const hashes: string[] = [];
  return {
    hashes,
    findActiveSessionUser(tokenHash) {
      hashes.push(tokenHash);
      return Promise.resolve(user);
    },
  };
}

describe('parseBearerToken', () => {
  it('extracts a well-formed token', () => {
    expect(parseBearerToken(`Bearer ${VALID_TOKEN}`)).toBe(VALID_TOKEN);
  });

  it.each([
    [undefined],
    [''],
    [`bearer ${VALID_TOKEN}`],
    [`Bearer  ${VALID_TOKEN}`],
    ['Bearer short'],
    [`Bearer ${'a'.repeat(201)}`],
    [`Bearer ${VALID_TOKEN}=`],
    [`Bearer ${VALID_TOKEN} extra`],
  ])('rejects %j', (header) => {
    expect(parseBearerToken(header)).toBeNull();
  });
});

describe('hashSessionToken', () => {
  it('produces the SHA-256 hex digest stored by LingoBrain', () => {
    expect(hashSessionToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('authenticate', () => {
  it('returns the session user looked up by token hash', async () => {
    const sessions = lookupReturning({ userId: 7, username: 'alice' });
    await expect(authenticate({ headers: { authorization: `Bearer ${VALID_TOKEN}` } }, sessions)).resolves.toEqual({
      userId: 7,
      username: 'alice',
    });
    expect(sessions.hashes).toEqual([hashSessionToken(VALID_TOKEN)]);
  });

  it('rejects a missing token without touching the database', async () => {
    const sessions = lookupReturning({ userId: 7, username: 'alice' });
    await expect(authenticate({ headers: {} }, sessions)).rejects.toMatchObject({ statusCode: 401 });
    expect(sessions.hashes).toEqual([]);
  });

  it('rejects an unknown or expired session', async () => {
    const error = await authenticate({ headers: { authorization: `Bearer ${VALID_TOKEN}` } }, lookupReturning(null)).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ statusCode: 401 });
  });
});
