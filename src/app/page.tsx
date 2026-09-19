import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { SignInButton } from "@/components/spotify/sign-in-button";
import { BRAND } from "@/lib/brand";

/* Codes come from the OAuth callback; anything unknown falls back to generic. */
const ERRORS: Record<string, string> = {
  odmowa: "Nie udzielono zgody w Spotify. Bez niej nie odczytamy biblioteki.",
  "brak-kodu": "Spotify nie odesłał kodu autoryzacji. Spróbuj jeszcze raz.",
  "wygasla-proba": "Próba logowania wygasła. Zacznij od nowa — powinno pójść gładko.",
  "zly-state": "Logowanie nie pochodziło z tej strony i zostało odrzucone.",
  "brak-refresh-tokenu": "Spotify nie wydał tokenu odświeżania. Spróbuj ponownie.",
  "wymiana-nieudana": "Nie udało się dokończyć logowania po stronie Spotify.",
  "wygasla-zgoda": "Zgoda wygasła po sześciu miesiącach. Zaloguj się ponownie.",
};

export default async function LandingPage(props: PageProps<"/">) {
  const params = await props.searchParams;
  const code = typeof params.blad === "string" ? params.blad : undefined;
  const error = code === undefined ? undefined : (ERRORS[code] ?? "Logowanie się nie powiodło.");

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
            Nic nie zapisujemy na Twoim koncie bez Twojej zgody.
          </p>
        </div>
      </main>
      <AttributionFooter />
    </>
  );
}
