import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { hasOnboarded } from "@/lib/auth/onboarding";
import { readSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Start" };

export default async function StartPage() {
  const session = await readSession();
  if (session === undefined) redirect("/");
  if (await hasOnboarded(session.accountId)) redirect("/library");

  return (
    <>
      <AppHeader session={session} />
      <main className="flex flex-1 items-start justify-center px-6 py-16 sm:items-center">
        <OnboardingFlow
          displayName={session.displayName ?? "there"}
          connected={session.ai?.provider}
        />
      </main>
      <AttributionFooter />
    </>
  );
}
