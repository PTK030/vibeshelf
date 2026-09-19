import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { SignInButton } from "@/components/spotify/sign-in-button";
import { BRAND } from "@/lib/brand";

export default function LandingPage() {
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
