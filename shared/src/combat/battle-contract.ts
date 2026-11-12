import type { BattleLogEntry } from './battle-replay.js';
import type { BattleSetup } from './battle-types.js';

/** Body của `POST /herox/api/battles`. */
export interface StartBattleRequest {
  readonly encounterId: string;
}

export interface StartBattleResponse {
  readonly battleId: string;
  readonly setup: BattleSetup;
  /** `true` khi người chơi học chưa đủ từ: trận hướng dẫn với bộ từ cố định, client nhắc học thêm ở LingoBrain. */
  readonly tutorial: boolean;
}

/** Body của `POST /herox/api/battles/:battleId/result`: log input tối giản, server tự chạy lại để tính kết quả. */
export interface BattleResultRequest {
  readonly entries: readonly BattleLogEntry[];
  readonly endedAtMs: number;
}

/** `fled`: client gửi kết quả khi trận chưa ngã ngũ (người chơi rời trận). */
export type SettledBattleOutcome = 'victory' | 'defeat' | 'fled';

export interface BattleResultResponse {
  readonly outcome: SettledBattleOutcome;
  /** Vàng nhận được (chỉ khi thắng). */
  readonly goldEarned: number;
  /** Từ đã sai trong trận, đã ghi vào danh sách ôn của HeroX. */
  readonly missedWordIds: readonly string[];
}
