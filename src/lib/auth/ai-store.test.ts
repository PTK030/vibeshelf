import { randomBytes } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

const { forgetAi, recallAi, rememberAi } = await import("@/lib/auth/ai-store");

const connection = { provider: "openrouter", key: "sk-or-v1-secret", model: "x/y" } as const;

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

describe("remembered AI connection", () => {
  it("survives a sign-out", async () => {
    await rememberAi("acct-1", connection);

    /* Sign-out clears the session cookie; this one is deliberately separate. */
    jar.delete("vs_session");

    expect(await recallAi("acct-1")).toEqual(connection);
  });

  it("keeps accounts apart, so one user never gets another's key", async () => {
    await rememberAi("acct-1", connection);

    expect(await recallAi("acct-2")).toBeUndefined();
  });

  it("forgets on an explicit disconnect", async () => {
    await rememberAi("acct-1", connection);
    await forgetAi("acct-1");

    expect(await recallAi("acct-1")).toBeUndefined();
  });

  it("replaces the connection when the provider changes", async () => {
    await rememberAi("acct-1", connection);
    const next = { provider: "anthropic", key: "sk-ant-other", model: "claude" } as const;

    await rememberAi("acct-1", next);

    expect(await recallAi("acct-1")).toEqual(next);
  });

  it("does not store the key in readable form", async () => {
    await rememberAi("acct-1", connection);

    expect(jar.get("vs_ai")).not.toContain("sk-or-v1-secret");
  });

  it("treats an unreadable cookie as nothing stored", async () => {
    jar.set("vs_ai", "not-a-jwe");

    expect(await recallAi("acct-1")).toBeUndefined();
  });
});
