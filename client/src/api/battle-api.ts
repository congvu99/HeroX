import {
  apiPath,
  type BattleResultRequest,
  type BattleResultResponse,
  type StartBattleRequest,
  type StartBattleResponse,
} from '@herox/shared';
import { requestJson, type ApiResult } from './api-request';

function isStartBattleResponse(value: unknown): value is StartBattleResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { battleId, setup } = value as Partial<Record<keyof StartBattleResponse, unknown>>;
  if (typeof battleId !== 'string' || typeof setup !== 'object' || setup === null) return false;
  const { words, enemies } = setup as Partial<Record<string, unknown>>;
  return Array.isArray(words) && Array.isArray(enemies);
}

function isBattleResultResponse(value: unknown): value is BattleResultResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { outcome, goldEarned, missedWordIds } = value as Partial<Record<keyof BattleResultResponse, unknown>>;
  return (
    typeof outcome === 'string' &&
    typeof goldEarned === 'number' &&
    Array.isArray(missedWordIds) &&
    missedWordIds.every((id) => typeof id === 'string')
  );
}

/** `POST /herox/api/battles`: server cấp seed, bộ từ, quái; client chạy trận bằng đúng setup này. */
export function startBattle(token: string, request: StartBattleRequest, fetchImpl: typeof fetch): Promise<ApiResult<StartBattleResponse>> {
  return requestJson({ method: 'POST', url: apiPath('battles'), token, body: request, isExpected: isStartBattleResponse }, fetchImpl);
}

/** `POST /herox/api/battles/:battleId/result`: gửi log input, server chạy lại để tính thưởng. */
export function submitBattleResult(
  token: string,
  battleId: string,
  request: BattleResultRequest,
  fetchImpl: typeof fetch,
): Promise<ApiResult<BattleResultResponse>> {
  const url = apiPath(`battles/${encodeURIComponent(battleId)}/result`);
  return requestJson({ method: 'POST', url, token, body: request, isExpected: isBattleResultResponse }, fetchImpl);
}
