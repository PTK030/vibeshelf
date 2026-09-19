import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { ProviderIdSchema } from "@/lib/ai/providers";
import { serverEnv } from "@/lib/env";

const SESSION_COOKIE = "vs_session";
const PKCE_COOKIE = "vs_pkce";

/*
 * There is no database in this app on purpose: everything the server needs
 * between requests fits in one encrypted cookie. That keeps deployment to a
 * single Vercel project with no external state, at the cost of the library
 * having to be re-read from Spotify on each run.
 *
 * The cookie is a JWE (A256GCM), so the browser cannot read or forge it.
 */
const SessionSchema = z.object({
  /* account_id — stable and pseudonymous, per Spotify's guidance. */
  accountId: z.string(),
  displayName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  accessToken: z.string(),
  refreshToken: z.string(),
  /* Epoch millis. Read from the token response, never hardcoded. */
  expiresAt: z.number(),
  /* Epoch millis of the ORIGINAL consent — drives the 6-month expiry warning. */
  authorizedAt: z.number(),
  scopes: z.array(z.string()),
  /*
   * The AI backend the user brought. Held here rather than in a database for
   * the same reason as the Spotify tokens: there is no database.
   */
  ai: z
    .object({
      provider: ProviderIdSchema,
      key: z.string(),
      model: z.string(),
    })
    .optional(),
  /* Per-viewer app settings that the server also needs to honour. */
  settings: z
    .object({
      deepAnalysis: z.boolean(),
      playlistScoring: z.boolean(),
      realtimeSuggestions: z.boolean(),
    })
    .optional(),
});

export type Session = z.infer<typeof SessionSchema>;

const PkceSchema = z.object({
  verifier: z.string(),
  state: z.string(),
});

export type PkceState = z.infer<typeof PkceSchema>;

function secretKey(): Uint8Array {
  const key = Buffer.from(serverEnv().ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes.");
  }
  return new Uint8Array(key);
}

async function seal(payload: Record<string, unknown>, maxAgeSeconds: number): Promise<string> {
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .encrypt(secretKey());
}

async function unseal(token: string): Promise<Record<string, unknown> | undefined> {
  try {
    const { payload } = await jwtDecrypt(token, secretKey());
    return payload;
  } catch {
    /* Expired, tampered with, or encrypted under a rotated key. */
    return undefined;
  }
}

/* Spotify refresh tokens die after 6 months, so there is no point outliving that. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const PKCE_MAX_AGE_SECONDS = 60 * 10;

export async function writeSession(session: Session): Promise<void> {
  const jwe = await seal(session, SESSION_MAX_AGE_SECONDS);
  const store = await cookies();

  store.set(SESSION_COOKIE, jwe, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<Session | undefined> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw === undefined) return undefined;

  const payload = await unseal(raw);
  if (payload === undefined) return undefined;

  const parsed = SessionSchema.safeParse(payload);
  return parsed.success ? parsed.data : undefined;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function writePkce(state: PkceState): Promise<void> {
  const jwe = await seal(state, PKCE_MAX_AGE_SECONDS);
  const store = await cookies();

  store.set(PKCE_COOKIE, jwe, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PKCE_MAX_AGE_SECONDS,
  });
}

export async function consumePkce(): Promise<PkceState | undefined> {
  const store = await cookies();
  const raw = store.get(PKCE_COOKIE)?.value;
  store.delete(PKCE_COOKIE);
  if (raw === undefined) return undefined;

  const payload = await unseal(raw);
  if (payload === undefined) return undefined;

  const parsed = PkceSchema.safeParse(payload);
  return parsed.success ? parsed.data : undefined;
}
