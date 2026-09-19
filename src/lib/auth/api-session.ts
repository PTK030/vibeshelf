import { type Session, clearSession, readSession, writeSession } from "@/lib/auth/session";
import { ReconsentRequiredError, refreshAccessToken } from "@/lib/spotify/oauth";

const EXPIRY_MARGIN_MS = 60_000;

/*
 * Same job as requireSession(), but for route handlers: returns undefined
 * instead of redirecting, so the caller can answer with a status code.
 */
export async function requireSessionForApi(): Promise<Session | undefined> {
  const session = await readSession();
  if (session === undefined) return undefined;

  if (session.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return session;

  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const refreshed: Session = {
      ...session,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? session.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    await writeSession(refreshed);
    return refreshed;
  } catch (error) {
    if (error instanceof ReconsentRequiredError) {
      /* The 6-month window is over. Drop the session; retrying cannot help. */
      await clearSession();
      return undefined;
    }
    throw error;
  }
}
