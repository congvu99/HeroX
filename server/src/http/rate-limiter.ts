export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  /** Trần số key giữ trong RAM; vượt thì bỏ key cũ nhất để key giả không làm phình bộ nhớ. */
  readonly maxKeys: number;
}

interface WindowEntry {
  readonly start: number;
  count: number;
}

/** Rate limit cửa sổ cố định trong RAM, cùng cách làm với LingoBrain (eng/server/request-guards.js). */
export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>();

  constructor(private readonly options: RateLimiterOptions) {}

  /** Tăng đếm cho `key`; trả `true` nếu vẫn trong hạn mức. */
  hit(key: string, now: number): boolean {
    let entry = this.currentEntry(key, now);
    if (!entry) {
      this.evictOldestWhileFull();
      entry = { start: now, count: 0 };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= this.options.limit;
  }

  /** Xoá cửa sổ đã hết hạn; gọi định kỳ. */
  sweep(now: number): void {
    for (const [key, entry] of this.entries) {
      if (now - entry.start >= this.options.windowMs) this.entries.delete(key);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  private currentEntry(key: string, now: number): WindowEntry | undefined {
    const entry = this.entries.get(key);
    if (entry && now - entry.start >= this.options.windowMs) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private evictOldestWhileFull(): void {
    for (const key of this.entries.keys()) {
      if (this.entries.size < this.options.maxKeys) return;
      this.entries.delete(key);
    }
  }
}
