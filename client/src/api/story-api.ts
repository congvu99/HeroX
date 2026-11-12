import { apiPath, type CompleteBeatRequest, type CreateHeroRequest, type HeroState, type StoryResponse } from '@herox/shared';
import { requestJson, type ApiResult } from './api-request';

function isStoryResponse(value: unknown): value is StoryResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { beats } = value as Partial<Record<keyof StoryResponse, unknown>>;
  return (
    Array.isArray(beats) &&
    beats.every((record: unknown) => {
      if (typeof record !== 'object' || record === null) return false;
      const { chapter, beat } = record as Partial<Record<'chapter' | 'beat', unknown>>;
      return typeof chapter === 'number' && typeof beat === 'string';
    })
  );
}

function isHeroState(value: unknown): value is HeroState {
  if (typeof value !== 'object' || value === null) return false;
  const { name, gender } = value as Partial<Record<keyof HeroState, unknown>>;
  return typeof name === 'string' && typeof gender === 'string';
}

/** `GET /herox/api/story`: mọi mốc truyện đã xong. */
export function fetchStory(token: string, fetchImpl: typeof fetch): Promise<ApiResult<StoryResponse>> {
  return requestJson({ method: 'GET', url: apiPath('story'), token, isExpected: isStoryResponse }, fetchImpl);
}

/** `POST /herox/api/story/beat`: server kiểm mốc trước, bằng chứng thắng trận, chữ thánh rồi mới ghi. */
export function completeStoryBeat(token: string, request: CompleteBeatRequest, fetchImpl: typeof fetch): Promise<ApiResult<StoryResponse>> {
  return requestJson({ method: 'POST', url: apiPath('story/beat'), token, body: request, isExpected: isStoryResponse }, fetchImpl);
}

/** `PUT /herox/api/hero`: tạo nhân vật lần đầu (tên, giới tính). */
export function createHero(token: string, request: CreateHeroRequest, fetchImpl: typeof fetch): Promise<ApiResult<HeroState>> {
  return requestJson({ method: 'PUT', url: apiPath('hero'), token, body: request, isExpected: isHeroState }, fetchImpl);
}
