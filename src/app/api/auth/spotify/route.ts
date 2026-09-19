import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { writePkce } from "@/lib/auth/session";
import { buildAuthorizeUrl, createPkcePair, createState } from "@/lib/spotify/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const host = request.headers.get("host");

  /*
   * Spotify rejects "localhost" as a redirect URI, so ours is 127.0.0.1. The
   * browser treats those as different origins: starting here on localhost
   * would write the PKCE cookie to an origin Spotify never returns to, and
   * sign-in would fail with "expired-attempt". Bounce before the cookie exists.
   *
   * This lives here rather than in proxy.ts because Next rewrites a cross-host
   * Location coming out of the proxy into a relative path.
   */
  if (host !== null && (host === "localhost" || host.startsWith("localhost:"))) {
    const target = `http://${host.replace("localhost", "127.0.0.1")}/api/auth/spotify`;
    return NextResponse.redirect(target, 307);
  }

  const { verifier, challenge } = createPkcePair();
  const state = createState();

  await writePkce({ verifier, state });

  redirect(buildAuthorizeUrl(challenge, state));
}
