import { describe, expect, it, vi } from 'vitest';
import { BEAT_REJECTION_MESSAGES, CHAPTER_1_BEATS as B, CITADEL_REJECTION_MESSAGES, TUTORIAL_ENCOUNTER_ID, type StoryBeatRecord, type StoryResponse } from '@herox/shared';
import { completeStoryBeat, createHero, fetchStory, heroCreationNeedsReload } from '../src/api/story-api';
import { DevCitadelGateway } from '../src/citadel/citadel-gateway';
import { isBuildingLocked } from '../src/citadel/citadel-view';
import { devCitadelSeed } from '../src/citadel/dev-citadel-fixture';
import { DevStoryBackend, StoryJournal } from '../src/story/story-journal';
import { buildWordChoices, storyTaughtWords, WORD_CHOICE_COUNT } from '../src/story/word-choices';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const STORY: StoryResponse = { beats: [{ chapter: 1, beat: B.awaken, completedAt: '2026-11-12T05:00:00.000Z' }] };

describe('story-api', () => {
  it('đọc và ghi mốc truyện qua đúng route, kèm Bearer', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(jsonResponse(200, STORY)));
    expect(await fetchStory('tok', fetchImpl)).toEqual({ kind: 'ok', value: STORY });
    await completeStoryBeat('tok', { chapter: 1, beat: B.chapelDoor, answer: 'door' }, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[1] ?? [];
    expect(url).toBe('/herox/api/story/beat');
    expect(init?.method).toBe('POST');
    expect(typeof init?.body).toBe('string');
    expect(JSON.parse(init?.body as string)).toEqual({ chapter: 1, beat: B.chapelDoor, answer: 'door' });
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
  });

  it('tạo nhân vật bằng PUT và báo lỗi server bằng câu tiếng Việt', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(409, { error: 'Nhân vật đã được tạo' }));
    const result = await createHero('tok', { name: 'An', gender: 'female' }, fetchImpl);
    expect(result).toMatchObject({ kind: 'failed', message: 'Nhân vật đã được tạo', status: 409 });
    expect(heroCreationNeedsReload(result)).toBe(true);
    expect(heroCreationNeedsReload({ kind: 'failed', message: 'Máy chủ lỗi', status: 503 })).toBe(false);
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('PUT');
  });

  it('coi body sai hình dạng là lỗi', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { beats: [{ beat: 1 }] }));
    expect((await fetchStory('tok', fetchImpl)).kind).toBe('failed');
  });
});

describe('StoryJournal on the dev backend', () => {
  it('chạy đúng luật mốc của server: thứ tự, bằng chứng thắng, chữ thánh', async () => {
    const journal = new StoryJournal(new DevStoryBackend(() => Date.UTC(2026, 10, 12)));
    const listener = vi.fn();
    journal.onChange(listener);
    await journal.load();
    expect(await journal.complete(1, B.gateImps)).toEqual({ kind: 'failed', message: BEAT_REJECTION_MESSAGES['prerequisites-missing'] });
    expect(await journal.complete(1, B.awaken)).toEqual({ kind: 'ok' });
    expect(await journal.complete(1, B.gateImps)).toEqual({ kind: 'failed', message: BEAT_REJECTION_MESSAGES['battle-not-won'] });
    journal.recordVictory(TUTORIAL_ENCOUNTER_ID);
    expect(await journal.complete(1, B.gateImps)).toEqual({ kind: 'ok' });
    await journal.complete(1, B.villageArrival);
    expect(await journal.complete(1, B.chapelDoor, 'dor')).toEqual({ kind: 'failed', message: BEAT_REJECTION_MESSAGES['wrong-answer'] });
    expect(await journal.complete(1, B.chapelDoor, 'Door')).toEqual({ kind: 'ok' });
    expect(journal.progress.has(1, B.chapelDoor)).toBe(true);
    expect(journal.beats.map((record) => record.beat)).toEqual([B.awaken, B.gateImps, B.villageArrival, B.chapelDoor]);
    // load + 4 mốc ghi được; lần từ chối không đổi tiến độ nên không báo.
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it('không gọi lại backend cho mốc đã xong', async () => {
    const backend = new DevStoryBackend();
    const journal = new StoryJournal(backend);
    await journal.complete(1, B.awaken);
    const spy = vi.spyOn(backend, 'complete');
    expect(await journal.complete(1, B.awaken)).toEqual({ kind: 'ok' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('forge lock in the citadel', () => {
  it('khoá lò rèn tới khi cứu thợ rèn, cả ở gateway dev', async () => {
    const story: StoryBeatRecord[] = [{ chapter: 1, beat: B.awaken, completedAt: '2026-11-12T05:00:00.000Z' }];
    const gateway = new DevCitadelGateway(devCitadelSeed(), () => Date.UTC(2026, 10, 12, 5), () => story);
    const loaded = await gateway.load();
    if (loaded.kind !== 'ok') throw new Error('dev gateway phải tải được');
    expect(isBuildingLocked(loaded.response, 'forge')).toBe(true);
    expect(await gateway.send({ type: 'upgrade', target: { kind: 'forge' } })).toEqual({ kind: 'failed', message: CITADEL_REJECTION_MESSAGES['building-locked'] });
    story.push({ chapter: 1, beat: B.smithRescued, completedAt: '2026-11-12T06:00:00.000Z' });
    const reloaded = await gateway.load();
    if (reloaded.kind !== 'ok') throw new Error('dev gateway phải tải được');
    expect(isBuildingLocked(reloaded.response, 'forge')).toBe(false);
  });
});

describe('word choices', () => {
  it('có đáp án, đủ số lựa chọn, không trùng và tất định', () => {
    const pool = storyTaughtWords();
    expect(pool).toContain('door');
    const choices = buildWordChoices('Door', pool);
    expect(choices).toHaveLength(WORD_CHOICE_COUNT);
    expect(choices).toContain('door');
    expect(new Set(choices).size).toBe(WORD_CHOICE_COUNT);
    expect(buildWordChoices('Door', pool)).toEqual(choices);
    expect(buildWordChoices('door', [])).toEqual(['door']);
  });
});
