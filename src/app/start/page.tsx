import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { readSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Start" };

export default async function StartPage() {
  const session = await readSession();
  if (session === undefined) redirect("/");

  return (
    <>
      <AppHeader displayName={session.displayName ?? undefined} showSignOut />
      <main className="flex flex-1 items-start justify-center px-6 py-16 sm:items-center">
        <OnboardingFlow
          displayName={session.displayName ?? "melomanie"}
          hasKey={session.openrouterKey !== undefined}
        />
      </main>
      <AttributionFooter />
    </>
  );
}
