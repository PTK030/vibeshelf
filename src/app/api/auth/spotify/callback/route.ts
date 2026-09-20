import { recallAi } from "@/lib/auth/ai-store";
import { hasOnboarded, markOnboarded } from "@/lib/auth/onboarding";
import { redirectToPath } from "@/lib/auth/redirect";
import { consumePkce, writeSession } from "@/lib/auth/session";
import { SpotifyClient } from "@/lib/spotify/client";
import { SPOTIFY_SCOPES, exchangeCodeForTokens } from "@/lib/spotify/oauth";

export const dynamic = "force-dynamic";

function failure(reason: string) {
  return redirectToPath(`/?error=${encodeURIComponent(reason)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  if (denied !== null) return failure("denied");
  if (code === null || state === null) return failure("no-code");

  const pkce = await consumePkce();
  if (pkce === undefined) return failure("expired-attempt");
  /* Mismatched state means the callback did not originate from our redirect. */
  if (pkce.state !== state) return failure("bad-state");

  try {
    const tokens = await exchangeCodeForTokens(code, pkce.verifier);
    if (tokens.refresh_token === undefined) return failure("no-refresh-token");

    const profile = await new SpotifyClient(tokens.access_token).currentUser();
    const now = Date.now();
    const accountId = profile.account_id ?? profile.id;

    /*
     * Carry the AI connection over from a previous session. Without this the
     * key is gone on every sign-in and onboarding has to run again.
     */
    const ai = await recallAi(accountId);

    await writeSession({
      /* Prefer the stable pseudonymous id; fall back while it rolls out. */
      accountId,
      displayName: profile.display_name ?? null,
      imageUrl: profile.images?.[0]?.url ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: now + tokens.expires_in * 1000,
      authorizedAt: now,
      scopes: tokens.scope?.split(" ") ?? [...SPOTIFY_SCOPES],
      ai,
    });

    /* A returning account with a provider already set up has finished setup. */
    if (ai !== undefined) await markOnboarded(accountId);

    /* Returning users go straight in; the intro is a one-off per account. */
    return redirectToPath((await hasOnboarded(accountId)) ? "/library" : "/start");
  } catch {
    return failure("exchange-failed");
  }
}
