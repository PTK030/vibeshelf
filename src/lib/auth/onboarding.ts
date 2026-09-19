import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

const COOKIE = "vs_onboarded";

/*
 * Which accounts have finished onboarding.
 *
 * Deliberately a separate cookie from the session, because it has to outlive
 * signing out — the whole point is that signing back in does not replay the
 * intro. Clearing the session must not clear this.
 *
 * Not SQLite: a file-backed database does not survive on Vercel's ephemeral
 * filesystem, and adding a hosted database to remember one boolean per account
 * would cost more than it is worth. The trade is that this is per browser —
 * a different browser replays onboarding once.
 */
const SeenSchema = z.object({
  /* Spotify account_id values, newest last. */
  accounts: z.array(z.string()).max(10),
});

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function secretKey(): Uint8Array {
  return new Uint8Array(Buffer.from(serverEnv().ENCRYPTION_KEY, "base64"));
}

async function read(): Promise<string[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw === undefined) return [];

  try {
    const { payload } = await jwtDecrypt(raw, secretKey());
    const parsed = SeenSchema.safeParse(payload);
    return parsed.success ? parsed.data.accounts : [];
  } catch {
    /* Expired or encrypted under a rotated key — treat as never onboarded. */
    return [];
  }
}

export async function hasOnboarded(accountId: string): Promise<boolean> {
  return (await read()).includes(accountId);
}

export async function markOnboarded(accountId: string): Promise<void> {
  const existing = await read();
  if (existing.includes(accountId)) return;

  /* Keep the ten most recent accounts; this is a cookie, not a database. */
  const accounts = [...existing, accountId].slice(-10);

  const jwe = await new EncryptJWT({ accounts })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(secretKey());

  (await cookies()).set(COOKIE, jwe, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
