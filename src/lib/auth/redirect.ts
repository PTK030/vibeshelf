import { NextResponse } from "next/server";

/*
 * Redirect to a path on the *same origin the browser is already using*.
 *
 * Deliberately relative. `new URL(path, request.url)` looks equivalent but is
 * not: Next normalises request.url to localhost regardless of how the request
 * arrived, so an absolute redirect built from it moves the browser from
 * 127.0.0.1 to localhost. Those are separate cookie origins, so the session
 * written during the OAuth callback becomes invisible and the user is bounced
 * straight back to the landing page.
 *
 * A relative Location sidesteps the whole question — the browser keeps the
 * origin it already has.
 */
export function redirectToPath(path: string, status: 303 | 307 = 307): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}
