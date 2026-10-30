export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Token-bucket rate limiter. Holds up to `ratePerSecond` tokens and refills
 * continuously. When empty, callers reserve a future token and wait for it,
 * so concurrent callers are served in order without busy-waiting.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;

  constructor(
    private readonly ratePerSecond: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: Sleep = realSleep,
  ) {
    if (!(ratePerSecond > 0)) throw new RangeError('ratePerSecond must be > 0');
    this.capacity = Math.max(1, ratePerSecond);
    this.tokens = this.capacity;
    this.lastRefill = now();
  }

  async acquire(): Promise<void> {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.lastRefill) / 1000) * this.ratePerSecond);
    this.lastRefill = t;
    this.tokens -= 1;
    if (this.tokens >= 0) return;
    await this.sleep((-this.tokens / this.ratePerSecond) * 1000);
  }
}
