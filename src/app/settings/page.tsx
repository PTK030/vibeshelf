import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { Card } from "@/components/ui/card";
import { SettingsPanel } from "@/features/settings/settings-panel";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/* Spotify refresh tokens expire six months after the original consent. */
const CONSENT_DAYS = 180;

export default async function SettingsPage() {
  const session = await requireSession();

  const elapsedDays = Math.floor((Date.now() - session.authorizedAt) / 86_400_000);
  const daysLeft = Math.max(0, CONSENT_DAYS - elapsedDays);

  return (
    <>
      <AppHeader session={session} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href="/library"
          className="text-xs text-muted transition-colors duration-350 ease-smooth hover:text-foreground"
        >
          ← Library
        </Link>

        <h1 className="mt-4 mb-10 text-xl font-bold">Settings</h1>

        <SettingsPanel connected={session.ai?.provider} model={session.ai?.model} />

        <section className="mt-10">
          <h2 className="mb-1 text-sm font-semibold">Spotify account</h2>
          <p className="mb-4 text-xs text-muted">
            Signed in as {session.displayName ?? "a Spotify user"}.
          </p>

          <Card className="flex flex-wrap items-center justify-between gap-4">
            <p className="min-w-0 flex-1 text-xs text-muted">
              Spotify expires consent six months after it is granted, and using the app does not
              extend it.{" "}
              {daysLeft === 0
                ? "Your consent has expired — sign in again."
                : `${daysLeft} days left.`}
            </p>

            <form action="/api/auth/logout" method="post" className="shrink-0">
              <button
                type="submit"
                className="label-caps rounded-pill border border-border-strong px-5 py-2 text-2xs text-muted transition-colors duration-350 ease-smooth hover:border-danger hover:text-danger"
              >
                Sign out
              </button>
            </form>
          </Card>
        </section>
      </main>

      <AttributionFooter />
    </>
  );
}
