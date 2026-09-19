import { NextResponse } from "next/server";
import { consumePkce, writeSession } from "@/lib/auth/session";
import { SpotifyClient } from "@/lib/spotify/client";
import { SPOTIFY_SCOPES, exchangeCodeForTokens } from "@/lib/spotify/oauth";

export const dynamic = "force-dynamic";

function failure(request: Request, reason: string): NextResponse {
  const url = new URL("/", request.url);
  url.searchParams.set("blad", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  if (denied !== null) return failure(request, "odmowa");
  if (code === null || state === null) return failure(request, "brak-kodu");

  const pkce = await consumePkce();
  if (pkce === undefined) return failure(request, "wygasla-proba");
  /* Mismatched state means the callback did not originate from our redirect. */
  if (pkce.state !== state) return failure(request, "zly-state");

  try {
    const tokens = await exchangeCodeForTokens(code, pkce.verifier);
    if (tokens.refresh_token === undefined) return failure(request, "brak-refresh-tokenu");

    const profile = await new SpotifyClient(tokens.access_token).currentUser();
    const now = Date.now();

    await writeSession({
      /* Prefer the stable pseudonymous id; fall back while it rolls out. */
      accountId: profile.account_id ?? profile.id,
      displayName: profile.display_name ?? null,
      imageUrl: profile.images?.[0]?.url ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: now + tokens.expires_in * 1000,
      authorizedAt: now,
      scopes: tokens.scope?.split(" ") ?? [...SPOTIFY_SCOPES],
    });

    return NextResponse.redirect(new URL("/start", request.url));
  } catch {
    return failure(request, "wymiana-nieudana");
  }
}
