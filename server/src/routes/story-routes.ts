import type { FastifyInstance } from 'fastify';
import {
  apiPath,
  BEAT_REJECTION_MESSAGES,
  checkBeatCompletion,
  StoryProgress,
  type CompleteBeatRequest,
  type StoryResponse,
} from '@herox/shared';
import type { AuthorizeRequest } from '../http/api-guard.js';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import type { StoryStore } from '../story/story-repository.js';

export interface StoryRouteServices {
  readonly story: StoryStore;
}

// Id mốc ngắn (vd `scarecrow-defeated`); chữ thánh là một từ tiếng Anh.
const MAX_BEAT_LENGTH = 64;
const MAX_ANSWER_LENGTH = 64;
const MAX_CHAPTER = 99;

function invalidRequest(): HttpError {
  return new HttpError(400, 'Yêu cầu truyện sai định dạng', API_ERROR_CODES.invalidRequest);
}

function heroMissing(): HttpError {
  return new HttpError(409, 'Cần tạo nhân vật trước khi vào truyện', API_ERROR_CODES.heroMissing);
}

function parseCompleteBeat(body: unknown): CompleteBeatRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw invalidRequest();
  const fields = body as Readonly<Record<string, unknown>>;
  const { chapter, beat, answer } = fields;
  if (typeof chapter !== 'number' || !Number.isSafeInteger(chapter) || chapter < 1 || chapter > MAX_CHAPTER) throw invalidRequest();
  if (typeof beat !== 'string' || beat === '' || beat.length > MAX_BEAT_LENGTH) throw invalidRequest();
  if (answer === undefined) return { chapter, beat };
  if (typeof answer !== 'string' || answer.length > MAX_ANSWER_LENGTH) throw invalidRequest();
  return { chapter, beat, answer };
}

/**
 * Đăng ký `GET /herox/api/story` và `POST /herox/api/story/beat`.
 * Server là nguồn sự thật của tiến độ truyện: mốc chỉ ghi khi đủ mốc trước và đủ bằng chứng
 * (thắng trận ghi ở `encounter_victories`, chữ thánh gõ đúng), nên không nhảy cóc bằng cách gọi API.
 */
export function registerStoryRoutes(scope: FastifyInstance, services: StoryRouteServices, authorize: AuthorizeRequest): void {
  scope.get(apiPath('story'), async (request): Promise<StoryResponse> => {
    const user = await authorize(request);
    const beats = await services.story.readStory(user.userId);
    if (beats === null) throw heroMissing();
    return { beats };
  });

  scope.post(apiPath('story/beat'), async (request): Promise<StoryResponse> => {
    const user = await authorize(request);
    const body = parseCompleteBeat(request.body);
    const write = await services.story.completeBeat(user.userId, body.chapter, body.beat, (snapshot) => {
      const check = checkBeatCompletion(body.chapter, body.beat, new StoryProgress(snapshot.beats), {
        wonEncounterIds: snapshot.wonEncounterIds,
        answer: body.answer,
      });
      if (check.ok) return;
      // Không log đáp án người chơi gõ, chỉ mốc và lý do.
      request.log.info({ code: API_ERROR_CODES.storyRejected, beat: body.beat, reason: check.reason }, 'Từ chối mốc truyện');
      const status = check.reason === 'unknown-beat' ? 400 : 422;
      throw new HttpError(status, BEAT_REJECTION_MESSAGES[check.reason], API_ERROR_CODES.storyRejected);
    });
    if (write.kind === 'missing') throw heroMissing();
    return { beats: write.beats };
  });
}
