/**
 * Giới hạn số lần gọi theo key trong 1 cửa sổ thời gian cố định.
 * Lưu trong bộ nhớ process — đủ cho 1 instance; nhiều instance thì mỗi instance đếm riêng.
 */
export class FixedWindowRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** true nếu còn quota (và tính lần gọi này), false nếu đã vượt. */
  consume(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return true;
    }

    if (entry.count >= this.limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  private prune(now: number) {
    if (this.hits.size < 10_000) return;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}
