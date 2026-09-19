import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { SignInButton } from "@/components/spotify/sign-in-button";
import { BRAND } from "@/lib/brand";

/* Codes come from the OAuth callback; anything unknown falls back to generic. */
const ERRORS: Record<string, string> = {
  denied: "Access was not granted in Spotify. Without it we cannot read your library.",
  "no-code": "Spotify did not return an authorisation code. Try again.",
  "expired-attempt": "That sign-in attempt expired. Start again — it should go through.",
  "bad-state": "That sign-in did not originate here, so it was rejected.",
  "no-refresh-token": "Spotify issued no refresh token. Try again.",
  "exchange-failed": "Sign-in could not be completed on Spotify’s side.",
  "consent-expired": "Your consent expired after six months. Sign in again.",
};

export default async function LandingPage(props: PageProps<"/">) {
  const params = await props.searchParams;
  const code = typeof params.error === "string" ? params.error : undefined;
  const error = code === undefined ? undefined : (ERRORS[code] ?? "Sign-in failed.");

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-2xl leading-tight font-bold text-balance sm:text-3xl">
            {BRAND.tagline}
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base text-muted text-pretty">
            {BRAND.description}
          </p>

          {error !== undefined && (
            <p
              role="alert"
              className="mx-auto mt-8 max-w-md rounded-md border border-danger/40 bg-surface px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <SignInButton className="mt-10" />

          <p className="mt-5 text-xs text-muted">
            Nothing is written to your account without your say-so.
          </p>
        </div>
      </main>
      <AttributionFooter />
    </>
  );
}
