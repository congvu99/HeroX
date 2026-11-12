/**
 * Đổi delta khung hình lẻ của game loop (vd 16,67 ms ở 60 FPS) thành số ms nguyên cho `step`/`stepRecorded`.
 * Thời gian trận luôn là số nguyên ms để log input (`atMs`) qua được kiểm tra của server; phần lẻ được cộng dồn
 * sang khung sau nên đồng hồ trận không chậm dần so với thời gian thật.
 */
export class BattleFrameClock {
  private carryMs = 0;

  /** Nhận delta thật của khung hình, trả số ms nguyên cần cho trận trôi. Delta âm/NaN coi như 0. */
  advance(frameDeltaMs: number): number {
    const totalMs = this.carryMs + (Number.isFinite(frameDeltaMs) && frameDeltaMs > 0 ? frameDeltaMs : 0);
    const wholeMs = Math.floor(totalMs);
    this.carryMs = totalMs - wholeMs;
    return wholeMs;
  }
}
