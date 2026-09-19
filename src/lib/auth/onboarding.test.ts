import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The cookie jar is faked rather than mocking next/headers wholesale, so the
 * encryption and the ten-account cap are exercised for real.
 */
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));

const { hasOnboarded, markOnboarded } = await import("@/lib/auth/onboarding");

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.SPOTIFY_CLIENT_ID = "test";
  process.env.SPOTIFY_CLIENT_SECRET = "test";
  process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/spotify/callback";
  process.env.OPENROUTER_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/openrouter/callback";
  process.env.SESSION_SECRET = "0123456789abcdef";
  process.env.JOB_RUNNER_SECRET = "0123456789abcdef";
});

beforeEach(() => {
  jar.clear();
});

describe("onboarding record", () => {
  it("remembers an account across sign-outs", async () => {
    expect(await hasOnboarded("acct-1")).toBe(false);

    await markOnboarded("acct-1");

    /* Signing out clears the session cookie only; this one is untouched. */
    jar.delete("vs_session");

    expect(await hasOnboarded("acct-1")).toBe(true);
  });

  it("keeps accounts apart", async () => {
    await markOnboarded("acct-1");

    expect(await hasOnboarded("acct-2")).toBe(false);
  });

  it("does not grow without bound", async () => {
    /* Sequential on purpose: each call reads back the cookie the last one wrote. */
    /* eslint-disable-next-line no-await-in-loop */
    for (let i = 0; i < 14; i += 1) await markOnboarded(`acct-${i}`);

    /* Oldest entries fall off; the most recent ten survive. */
    expect(await hasOnboarded("acct-13")).toBe(true);
    expect(await hasOnboarded("acct-0")).toBe(false);
  });

  it("treats an unreadable cookie as never onboarded", async () => {
    jar.set("vs_onboarded", "not-a-jwe");

    expect(await hasOnboarded("acct-1")).toBe(false);
  });

  it("is idempotent", async () => {
    await markOnboarded("acct-1");
    const first = jar.get("vs_onboarded");

    await markOnboarded("acct-1");

    expect(jar.get("vs_onboarded")).toBe(first);
  });
});
