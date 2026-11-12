import type { StoryBeatRecord } from '../citadel-contract.js';

/** Body của `POST /herox/api/story/beat`. */
export interface CompleteBeatRequest {
  readonly chapter: number;
  readonly beat: string;
  /** Chỉ mốc loại `word`: chữ người chơi gõ. */
  readonly answer?: string;
}

/** Body trả về của `GET /herox/api/story` và `POST /herox/api/story/beat`: mọi mốc đã xong. */
export interface StoryResponse {
  readonly beats: readonly StoryBeatRecord[];
}
