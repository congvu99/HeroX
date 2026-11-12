import type { FastifyInstance } from 'fastify';
import {
  apiPath,
  isHeroGender,
  normalizeHeroName,
  type CreateHeroRequest,
  type HeroState,
  type MeResponse,
} from '@herox/shared';
import type { HeroStore } from '../hero/hero-repository.js';
import type { AuthorizeRequest } from '../http/api-guard.js';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';
import { readUtcOffsetMinutes } from '../http/utc-offset.js';
import type { LearningSource } from '../learning/learning-repository.js';
import { computeLearningStats } from '../learning/learning-stats.js';

export interface MeRouteServices {
  readonly learning: LearningSource;
  readonly heroes: HeroStore;
  readonly now?: () => number;
}

function parseCreateHeroRequest(body: unknown): CreateHeroRequest {
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const name = normalizeHeroName(fields.name);
  if (name === null || !isHeroGender(fields.gender)) {
    throw new HttpError(400, 'Tên nhân vật 1–20 ký tự và giới tính hợp lệ', API_ERROR_CODES.invalidRequest);
  }
  return { name, gender: fields.gender };
}

/** Đăng ký `GET /herox/api/me` và `PUT /herox/api/hero` vào scope đã có guard (`registerGuardedApi`). */
export function registerMeRoutes(scope: FastifyInstance, services: MeRouteServices, authorize: AuthorizeRequest): void {
  const now = services.now ?? Date.now;

  scope.get(apiPath('me'), async (request): Promise<MeResponse> => {
    const utcOffsetMinutes = readUtcOffsetMinutes(request.query);
    const user = await authorize(request);
    const [progressData, deckWords, hero] = await Promise.all([
      services.learning.readProgressData(user.userId),
      services.learning.readDeckWords(),
      services.heroes.findHero(user.userId),
    ]);
    return {
      user: { id: user.userId, username: user.username },
      learning: computeLearningStats(progressData, deckWords, now(), { utcOffsetMinutes }),
      hero,
    };
  });

  scope.put(apiPath('hero'), async (request, reply): Promise<HeroState> => {
    const user = await authorize(request);
    const hero = await services.heroes.createHero(user.userId, parseCreateHeroRequest(request.body));
    if (hero === null) throw new HttpError(409, 'Nhân vật đã được tạo', API_ERROR_CODES.heroExists);
    void reply.code(201);
    return hero;
  });
}
