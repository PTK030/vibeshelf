import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { ProviderIdSchema } from "@/lib/ai/providers";
import { serverEnv } from "@/lib/env";

const COOKIE = "vs_ai";

/*
 * The AI connection, remembered per Spotify account across sign-outs.
 *
 * It used to live only in the session cookie, which is cleared on sign-out —
 * so signing back in meant reconnecting the provider and sitting through
 * onboarding again. Signing out of Spotify is not a reason to forget which
 * model someone brought.
 *
 * Separate from the session for that reason, and encrypted the same way. The
 * explicit "Disconnect" in settings is what removes it.
 */
const ConnectionSchema = z.object({
  provider: ProviderIdSchema,
  key: z.string(),
  model: z.string(),
});

export type AiConnection = z.infer<typeof ConnectionSchema>;

const StoreSchema = z.object({
  /* Keyed by Spotify account_id. */
  accounts: z.record(z.string(), ConnectionSchema),
});

/* Keys are long; a handful of accounts keeps this well inside the 4KB limit. */
const MAX_ACCOUNTS = 5;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function secretKey(): Uint8Array {
  return new Uint8Array(Buffer.from(serverEnv().ENCRYPTION_KEY, "base64"));
}

async function read(): Promise<Record<string, AiConnection>> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw === undefined) return {};

  try {
    const { payload } = await jwtDecrypt(raw, secretKey());
    const parsed = StoreSchema.safeParse(payload);
    return parsed.success ? parsed.data.accounts : {};
  } catch {
    /* Expired, or encrypted under a rotated key. */
    return {};
  }
}

async function write(accounts: Record<string, AiConnection>): Promise<void> {
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

export async function recallAi(accountId: string): Promise<AiConnection | undefined> {
  return (await read())[accountId];
}

export async function rememberAi(accountId: string, connection: AiConnection): Promise<void> {
  const accounts = await read();
  accounts[accountId] = connection;

  /* Drop the oldest entries if too many accounts have used this browser. */
  const trimmed = Object.fromEntries(Object.entries(accounts).slice(-MAX_ACCOUNTS));
  await write(trimmed);
}

export async function forgetAi(accountId: string): Promise<void> {
  const accounts = await read();
  if (accounts[accountId] === undefined) return;

  delete accounts[accountId];
  await write(accounts);
}
