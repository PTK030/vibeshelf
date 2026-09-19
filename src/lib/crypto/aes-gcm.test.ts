import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { DecryptionError, decryptSecret, encryptSecret } from "@/lib/crypto/aes-gcm";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  process.env.SPOTIFY_CLIENT_ID = "test";
  process.env.SPOTIFY_CLIENT_SECRET = "test";
  process.env.SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/spotify/callback";
  process.env.OPENROUTER_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/openrouter/callback";
  process.env.DATABASE_URL = "postgres://test";
  process.env.SESSION_SECRET = "0123456789abcdef";
  process.env.JOB_RUNNER_SECRET = "0123456789abcdef";
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    const secret = "BQD-xxxxx-refresh-token";
    const envelope = encryptSecret(secret, "user-1:refresh_token");

    expect(decryptSecret(envelope, "user-1:refresh_token")).toBe(secret);
  });

  it("produces a different ciphertext each time", () => {
    const a = encryptSecret("same input", "user-1:refresh_token");
    const b = encryptSecret("same input", "user-1:refresh_token");

    expect(a.equals(b)).toBe(false);
  });

  it("refuses to decrypt under a different AAD", () => {
    // This is the property that stops one user's token being replayed into
    // another user's row.
    const envelope = encryptSecret("secret", "user-1:refresh_token");

    expect(() => decryptSecret(envelope, "user-2:refresh_token")).toThrow(DecryptionError);
  });

  it("refuses to decrypt tampered ciphertext", () => {
    const envelope = encryptSecret("secret", "user-1:refresh_token");
    envelope[envelope.length - 1] ^= 0xff;

    expect(() => decryptSecret(envelope, "user-1:refresh_token")).toThrow(DecryptionError);
  });

  it("rejects an envelope that is too short", () => {
    expect(() => decryptSecret(Buffer.alloc(8), "user-1:refresh_token")).toThrow(DecryptionError);
  });
});
