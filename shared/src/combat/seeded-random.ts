/**
 * Bộ sinh số giả ngẫu nhiên mulberry32: cùng trạng thái đầu cho cùng dãy số trên mọi máy,
 * nên server chạy lại được trận y hệt client. Không dùng cho mục đích bảo mật.
 */
export class SeededRandom {
  private current: number;

  constructor(state: number) {
    this.current = state >>> 0;
  }

  /** Trạng thái hiện tại (uint32), lưu vào `BattleState` để bước sau đi tiếp đúng dãy. */
  get state(): number {
    return this.current;
  }

  /** Số thực trong [0, 1). */
  next(): number {
    this.current = (this.current + 0x6d2b79f5) >>> 0;
    let mixed = this.current;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  }

  /** Số nguyên trong [0, maxExclusive). */
  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** `true` với xác suất `probability`. */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items.length === 0 ? undefined : items[this.nextInt(items.length)];
  }

  /** Bản sao đã xáo (Fisher–Yates), không đổi mảng gốc. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(index + 1);
      const current = copy[index] as T;
      copy[index] = copy[swapIndex] as T;
      copy[swapIndex] = current;
    }
    return copy;
  }
}
