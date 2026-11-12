import {
  BEAT_REJECTION_MESSAGES,
  checkBeatCompletion,
  StoryProgress,
  type CompleteBeatRequest,
  type StoryBeatRecord,
  type StoryResponse,
} from '@herox/shared';
import type { ApiResult } from '../api/api-request';
import { completeStoryBeat, fetchStory } from '../api/story-api';

/** Nguồn tiến độ truyện: server thật, hoặc bản cục bộ khi dev chạy không có phiên LingoBrain. */
export interface StoryBackend {
  load(): Promise<ApiResult<StoryResponse>>;
  complete(request: CompleteBeatRequest): Promise<ApiResult<StoryResponse>>;
  /** Chỉ bản dev: trận thử không lên server nên tự ghi bằng chứng thắng. */
  recordVictory?(encounterId: string): void;
}

export type JournalResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'unauthenticated' };

export class ApiStoryBackend implements StoryBackend {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch,
  ) {}

  load(): Promise<ApiResult<StoryResponse>> {
    return fetchStory(this.token, this.fetchImpl);
  }

  complete(request: CompleteBeatRequest): Promise<ApiResult<StoryResponse>> {
    return completeStoryBeat(this.token, request, this.fetchImpl);
  }
}

/** Chỉ ở dev: chạy đúng luật mốc truyện của server trên bộ nhớ, giữ tới khi tải lại trang. */
export class DevStoryBackend implements StoryBackend {
  private beats: StoryBeatRecord[] = [];
  private readonly wonEncounterIds = new Set<string>();

  constructor(private readonly now: () => number = Date.now) {}

  load(): Promise<ApiResult<StoryResponse>> {
    return Promise.resolve({ kind: 'ok', value: { beats: this.beats } });
  }

  complete(request: CompleteBeatRequest): Promise<ApiResult<StoryResponse>> {
    const progress = new StoryProgress(this.beats);
    if (progress.has(request.chapter, request.beat)) return this.load();
    const check = checkBeatCompletion(request.chapter, request.beat, progress, {
      wonEncounterIds: this.wonEncounterIds,
      answer: request.answer,
    });
    if (!check.ok) return Promise.resolve({ kind: 'failed', message: BEAT_REJECTION_MESSAGES[check.reason] });
    this.beats = [...this.beats, { chapter: request.chapter, beat: request.beat, completedAt: new Date(this.now()).toISOString() }];
    return this.load();
  }

  recordVictory(encounterId: string): void {
    this.wonEncounterIds.add(encounterId);
  }
}

/**
 * Tiến độ truyện client đang thấy; mọi scene đọc chung qua registry. Chỉ đổi theo câu trả lời của
 * backend (server là nguồn sự thật), không tự đánh dấu mốc trước khi server nhận.
 */
export class StoryJournal {
  private records: readonly StoryBeatRecord[] = [];
  private current = new StoryProgress([]);
  private readonly listeners = new Set<() => void>();

  constructor(private readonly backend: StoryBackend) {}

  get progress(): StoryProgress {
    return this.current;
  }

  get beats(): readonly StoryBeatRecord[] {
    return this.records;
  }

  /** Gọi lại khi tiến độ đổi; trả hàm gỡ. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async load(): Promise<JournalResult> {
    return this.adopt(await this.backend.load());
  }

  /** Báo xong một mốc; mốc đã có thì không gọi lại server. */
  async complete(chapter: number, beat: string, answer?: string): Promise<JournalResult> {
    if (this.current.has(chapter, beat)) return { kind: 'ok' };
    const request: CompleteBeatRequest = answer === undefined ? { chapter, beat } : { chapter, beat, answer };
    return this.adopt(await this.backend.complete(request));
  }

  recordVictory(encounterId: string): void {
    this.backend.recordVictory?.(encounterId);
  }

  private adopt(result: ApiResult<StoryResponse>): JournalResult {
    if (result.kind === 'unauthenticated') return result;
    if (result.kind === 'failed') return { kind: 'failed', message: result.message };
    this.records = result.value.beats;
    this.current = new StoryProgress(this.records);
    for (const listener of this.listeners) listener();
    return { kind: 'ok' };
  }
}
