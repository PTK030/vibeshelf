import { redirect } from "next/navigation";
import { type Session, clearSession, readSession, writeSession } from "@/lib/auth/session";
import { ReconsentRequiredError, refreshAccessToken } from "@/lib/spotify/oauth";

/* Refresh a little early so a request cannot start with a token about to die. */
const EXPIRY_MARGIN_MS = 60_000;

/*
 * Returns a session whose access token is currently valid, refreshing it if
 * needed. On `invalid_grant` the 6-month refresh window is over: the session is
 * dropped and the user is sent back to consent. That case is never retried.
 */
export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (session === undefined) redirect("/");

  if (session.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return session;

  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const refreshed: Session = {
      ...session,
      accessToken: tokens.access_token,
      /* Spotify rotates the refresh token only sometimes; keep the old one otherwise. */
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    await writeSession(refreshed);
    return refreshed;
  } catch (error) {
    if (error instanceof ReconsentRequiredError) {
      await clearSession();
      redirect("/?blad=wygasla-zgoda");
    }
    throw error;
  }
}
