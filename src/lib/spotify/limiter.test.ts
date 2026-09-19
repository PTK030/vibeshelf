import { describe, expect, it } from "vitest";
import { SpotifyLimiter, isUnreasonableRetryAfter, parseRetryAfter } from "@/lib/spotify/limiter";

async function noop(): Promise<void> {}

describe("parseRetryAfter", () => {
  it("reads the seconds value Spotify sends", () => {
    expect(parseRetryAfter("30")).toBe(30);
  });

  it("falls back to 1s for a missing or malformed header", () => {
    expect(parseRetryAfter(null)).toBe(1);
    expect(parseRetryAfter("soon")).toBe(1);
    expect(parseRetryAfter("-5")).toBe(1);
  });
});

describe("isUnreasonableRetryAfter", () => {
  it("treats multi-minute waits as something to surface, not sleep through", () => {
    expect(isUnreasonableRetryAfter(60)).toBe(false);
    expect(isUnreasonableRetryAfter(3600)).toBe(true);
  });
});

describe("SpotifyLimiter", () => {
  it("halves the rate on a 429 and never drops below the floor", () => {
    const limiter = new SpotifyLimiter({ startRate: 8, minRate: 1.5 });

    limiter.noteRateLimited(1);
    expect(limiter.currentRate).toBe(4);

    for (let i = 0; i < 10; i += 1) limiter.noteRateLimited(1);
    expect(limiter.currentRate).toBe(1.5);
  });

  it("never exceeds the configured concurrency", async () => {
    const limiter = new SpotifyLimiter({ startRate: 1000, burst: 1000, concurrency: 3 });
    let active = 0;
    let peak = 0;

    async function tracked(): Promise<void> {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    }

    const runs = Array.from({ length: 12 }, () => limiter.run(tracked));
    await Promise.all(runs);

    expect(peak).toBeLessThanOrEqual(3);
  });

  it("holds every caller back while the bucket is frozen", async () => {
    const limiter = new SpotifyLimiter({ startRate: 1000, burst: 1000, concurrency: 4 });
    limiter.noteRateLimited(0.15);

    const startedAt = Date.now();
    await Promise.all(Array.from({ length: 4 }, () => limiter.run(noop)));

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(140);
  });
});
