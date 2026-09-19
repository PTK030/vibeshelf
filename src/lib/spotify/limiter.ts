/*
 * Spotify does not publish its rate limit — it is a rolling 30-second window of
 * undisclosed size. So the rate is adaptive (AIMD): the first 429 calibrates
 * it, and it creeps back up while requests keep succeeding.
 *
 * Two layers, because they solve different problems: the token bucket paces
 * requests, the concurrency cap bounds open sockets and stops a retry storm.
 */

export interface LimiterOptions {
  startRate?: number;
  minRate?: number;
  maxRate?: number;
  burst?: number;
  concurrency?: number;
}

export class RateLimitedError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Spotify rate limited the request; retry after ${retryAfterSeconds}s.`);
    this.name = "RateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/* Beyond this, waiting in-process is pointless — surface it to the caller. */
const UNREASONABLE_RETRY_AFTER_SECONDS = 120;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class SpotifyLimiter {
  private rate: number;
  private readonly minRate: number;
  private readonly maxRate: number;
  private readonly burst: number;
  private readonly concurrency: number;

  private tokens: number;
  private lastRefill = Date.now();
  private frozenUntil = 0;
  private lastThrottleAt = Date.now();
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(options: LimiterOptions = {}) {
    this.rate = options.startRate ?? 8;
    this.minRate = options.minRate ?? 1.5;
    this.maxRate = options.maxRate ?? 12;
    this.burst = options.burst ?? 10;
    this.concurrency = options.concurrency ?? 6;
    this.tokens = this.burst;
  }

  get currentRate(): number {
    return this.rate;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(this.burst, this.tokens + elapsedSeconds * this.rate);
  }

  /*
   * A 429 freezes the whole bucket, not just the failing request. Letting the
   * other in-flight callers continue is what turns one 429 into twenty.
   */
  noteRateLimited(retryAfterSeconds: number): void {
    this.frozenUntil = Math.max(this.frozenUntil, Date.now() + retryAfterSeconds * 1000);
    this.rate = Math.max(this.minRate, this.rate / 2);
    this.lastThrottleAt = Date.now();
  }

  private noteSuccess(): void {
    if (Date.now() - this.lastThrottleAt > 60_000) {
      this.rate = Math.min(this.maxRate, this.rate + 0.5);
      this.lastThrottleAt = Date.now();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  private releaseSlot(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next !== undefined) next();
  }

  /*
   * Sequential awaits are the point here: this paces requests. Running the
   * waits concurrently would defeat the limiter, so no-await-in-loop is off.
   */
  /* eslint-disable no-await-in-loop */
  private async waitForToken(): Promise<void> {
    for (;;) {
      const frozenFor = this.frozenUntil - Date.now();
      if (frozenFor > 0) {
        await sleep(frozenFor);
        continue;
      }

      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      await sleep(Math.max(10, ((1 - this.tokens) / this.rate) * 1000));
    }
  }
  /* eslint-enable no-await-in-loop */

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      await this.waitForToken();
      const result = await task();
      this.noteSuccess();
      return result;
    } finally {
      this.releaseSlot();
    }
  }
}

export function parseRetryAfter(header: string | null): number {
  /* Number(null) is 0, not NaN — an absent header must not mean "no wait". */
  if (header === null || header.trim() === "") return 1;

  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds <= 0) return 1;
  return seconds;
}

export function isUnreasonableRetryAfter(seconds: number): boolean {
  return seconds > UNREASONABLE_RETRY_AFTER_SECONDS;
}
