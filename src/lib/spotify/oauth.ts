import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

/*
 * Minimal set. Deliberately no user-read-email (nothing needs it, and it makes
 * the consent screen scarier) and no ugc-image-upload (cover art is out of
 * scope, and that endpoint has its own stricter rate limit).
 */
export const SPOTIFY_SCOPES = [
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-top-read",
  "user-follow-read",
  /* Recently played is the only route to "which playlists do you actually use". */
  "user-read-recently-played",
] as const;

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export function createPkcePair(): PkcePair {
  /* Spotify requires 43–128 characters; 64 random bytes gives 86. */
  const verifier = base64url(randomBytes(64));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createState(): string {
  return base64url(randomBytes(24));
}

export function buildAuthorizeUrl(challenge: string, state: string): string {
  const env = serverEnv();
  const params = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES.join(" "),
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  /* Read it, never assume 3600 — the docs do not state a value. */
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

/*
 * Thrown when Spotify answers `invalid_grant`. That means the refresh token is
 * past its 6-month life. It is NOT retryable: the only cure is fresh consent.
 */
export class ReconsentRequiredError extends Error {
  constructor() {
    super("Spotify refresh token expired; the user must authorise again.");
    this.name = "ReconsentRequiredError";
  }
}

export class SpotifyAuthError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SpotifyAuthError";
    this.status = status;
  }
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const env = serverEnv();
  const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
    "base64",
  );

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 400 && text.includes("invalid_grant")) {
      throw new ReconsentRequiredError();
    }
    throw new SpotifyAuthError(response.status, `Spotify token endpoint failed: ${text}`);
  }

  return TokenResponseSchema.parse(JSON.parse(text));
}

export async function exchangeCodeForTokens(
  code: string,
  verifier: string,
): Promise<TokenResponse> {
  const env = serverEnv();
  return await postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      client_id: env.SPOTIFY_CLIENT_ID,
      code_verifier: verifier,
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const env = serverEnv();
  return await postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.SPOTIFY_CLIENT_ID,
    }),
  );
}
