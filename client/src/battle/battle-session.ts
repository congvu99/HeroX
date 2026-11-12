import {
  BattleFrameClock,
  createBattle,
  isInputTooFast,
  stepRecorded,
  WORD_CHAINS,
  type BattleEvent,
  type BattleInput,
  type BattleLogEntry,
  type BattleResultRequest,
  type BattleSetup,
  type BattleState,
  type BattleWord,
  type WordChain,
} from '@herox/shared';

/**
 * Một trận đang chơi trên client: giữ trạng thái `battle-state`, đổi delta khung hình thành ms nguyên,
 * và ghi log input đúng cách server chạy lại. Không phụ thuộc Phaser để test được trong Node.
 */
export class BattleSession {
  private state: BattleState;
  private readonly clock = new BattleFrameClock();
  private readonly entries: BattleLogEntry[] = [];
  private pendingInput: BattleInput | null = null;
  private pendingEvents: BattleEvent[];

  constructor(setup: BattleSetup, chains: readonly WordChain[] = WORD_CHAINS) {
    const started = createBattle(setup, chains);
    this.state = started.state;
    this.pendingEvents = [...started.events];
  }

  get current(): BattleState {
    return this.state;
  }

  get isOver(): boolean {
    return this.state.outcome !== 'ongoing';
  }

  /** Còn trong 150 ms đầu sau khi đề hiện: input lúc này bị bỏ qua (server coi là gian lận). */
  get isInputLocked(): boolean {
    return isInputTooFast(this.state);
  }

  wordById(wordId: string): BattleWord | undefined {
    return this.state.index.wordsById.get(wordId);
  }

  /** Xếp input để áp ở khung kế; input sau ghi đè input chưa áp (người chơi không thể trả lời 2 lần trong 1 khung). */
  submit(input: BattleInput): void {
    if (!this.isOver) this.pendingInput = input;
  }

  /** Cho trận trôi theo delta khung hình, trả sự kiện phát sinh (kể cả sự kiện mở màn ở lần gọi đầu). */
  tick(frameDeltaMs: number): readonly BattleEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    if (this.isOver) return events;
    const result = stepRecorded(this.state, this.pendingInput, this.clock.advance(frameDeltaMs));
    this.pendingInput = null;
    this.state = result.state;
    if (result.logEntry !== null) this.entries.push(result.logEntry);
    return events.length === 0 ? result.events : [...events, ...result.events];
  }

  /** Body gửi server khi trận kết thúc hoặc người chơi rời trận. */
  resultRequest(): BattleResultRequest {
    return { entries: [...this.entries], endedAtMs: this.state.elapsedMs };
  }
}
