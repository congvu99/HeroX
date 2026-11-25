import {
  applyCitadelAction,
  buildCitadelResponse,
  CITADEL_REJECTION_MESSAGES,
  localDayKey,
  lockedBuildings,
  StoryProgress,
  type CitadelAction,
  type CitadelLearningStats,
  type CitadelResponse,
  type CitadelState,
  type CitadelWord,
  type StoryBeatRecord,
} from '@herox/shared';
import type { ApiResult } from '../api/api-request';
import { fetchCitadel, HTTP_CONFLICT, sendCitadelAction } from '../api/citadel-api';
import { currentUtcOffsetMinutes } from '../api/me-api';

/** Kết quả thao tác ở thành trì mà panel cần phân biệt để chọn cách báo cho người chơi. */
export type CitadelGatewayResult =
  | { readonly kind: 'ok'; readonly response: CitadelResponse }
  /** Trạng thái vừa đổi ở máy khác: đã tải bản mới, báo người chơi làm lại nếu cần. */
  | { readonly kind: 'reloaded'; readonly response: CitadelResponse; readonly message: string }
  /** Server từ chối hoặc lỗi mạng: giữ nguyên màn đang thấy. */
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'unauthenticated' };

/** Nguồn dữ liệu thành trì: server thật, hoặc bản cục bộ khi dev chạy không có phiên LingoBrain. */
export interface CitadelGateway {
  load(): Promise<CitadelGatewayResult>;
  send(action: CitadelAction): Promise<CitadelGatewayResult>;
}

export interface ApiCitadelGatewayOptions {
  readonly token: string;
  readonly fetchImpl: typeof fetch;
  readonly utcOffsetMinutes: () => number;
}

/** Gọi API thành trì; giữ `rowVersion` của lần đọc gần nhất để gửi kèm, gặp 409 thì tự tải lại. */
export class ApiCitadelGateway implements CitadelGateway {
  private rowVersion: number | null = null;

  constructor(private readonly options: ApiCitadelGatewayOptions) {}

  async load(): Promise<CitadelGatewayResult> {
    const { token, fetchImpl, utcOffsetMinutes } = this.options;
    return this.adopt(await fetchCitadel(token, utcOffsetMinutes(), fetchImpl));
  }

  async send(action: CitadelAction): Promise<CitadelGatewayResult> {
    if (this.rowVersion === null) {
      const loaded = await this.load();
      if (loaded.kind !== 'ok') return loaded;
    }
    const { token, fetchImpl, utcOffsetMinutes } = this.options;
    const result = await sendCitadelAction(token, action, this.rowVersion ?? 0, utcOffsetMinutes(), fetchImpl);
    if (result.kind !== 'failed' || result.status !== HTTP_CONFLICT) return this.adopt(result);
    const reloaded = await this.load();
    return reloaded.kind === 'ok' ? { kind: 'reloaded', response: reloaded.response, message: result.message } : reloaded;
  }

  private adopt(result: ApiResult<CitadelResponse>): CitadelGatewayResult {
    if (result.kind === 'ok') {
      this.rowVersion = result.value.state.rowVersion;
      return { kind: 'ok', response: result.value };
    }
    return result.kind === 'unauthenticated' ? result : { kind: 'failed', message: result.message };
  }
}

export interface DevCitadelSeed {
  readonly state: CitadelState;
  readonly stats: CitadelLearningStats;
  readonly words: readonly CitadelWord[];
}

/** Chỉ ở dev: chạy luật thành trì trên trạng thái trong bộ nhớ để thử giao diện khi không có server. */
export class DevCitadelGateway implements CitadelGateway {
  private state: CitadelState;
  private readonly learnedWordIds: ReadonlySet<string>;

  /** `story`: tiến độ truyện cục bộ để khoá lò rèn như server; thiếu thì không khoá công trình nào. */
  constructor(
    private readonly seed: DevCitadelSeed,
    private readonly now: () => number = Date.now,
    private readonly story?: () => readonly StoryBeatRecord[],
  ) {
    this.state = seed.state;
    this.learnedWordIds = new Set(seed.words.map((word) => word.id));
  }

  load(): Promise<CitadelGatewayResult> {
    return Promise.resolve({ kind: 'ok', response: this.response() });
  }

  send(action: CitadelAction): Promise<CitadelGatewayResult> {
    const context = {
      stats: this.seed.stats,
      today: this.today(),
      learnedWordIds: this.learnedWordIds,
      ...(this.story === undefined ? {} : { lockedBuildings: lockedBuildings(new StoryProgress(this.story()), this.state.forgeLevel) }),
    };
    const result = applyCitadelAction(this.state, context, action);
    if (!result.ok) return Promise.resolve({ kind: 'failed', message: CITADEL_REJECTION_MESSAGES[result.reason] });
    this.state = { ...result.state, rowVersion: result.state.rowVersion + 1 };
    return this.load();
  }

  private today(): string {
    const nowMs = this.now();
    return localDayKey(nowMs, currentUtcOffsetMinutes(new Date(nowMs)));
  }

  private response(): CitadelResponse {
    return buildCitadelResponse({ state: this.state, stats: this.seed.stats, words: this.seed.words, story: this.story?.() ?? [], today: this.today() });
  }
}
