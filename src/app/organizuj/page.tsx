import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { Card } from "@/components/ui/card";
import { OrganizePanel, type ModelChoice } from "@/features/organize/organize-panel";
import { requireSession } from "@/lib/auth/require-session";
import { listStructuredOutputModels } from "@/lib/openrouter/client";
import { SpotifyClient } from "@/lib/spotify/client";

export const metadata: Metadata = { title: "Organizuj" };
export const dynamic = "force-dynamic";

/*
 * Sensible defaults surfaced first. Every model in the list supports structured
 * outputs; these are simply the ones worth reaching for by default.
 */
const PREFERRED = [
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "deepseek/deepseek-chat",
];

function orderModels(models: ModelChoice[]): ModelChoice[] {
  const rank = (id: string) => {
    const index = PREFERRED.indexOf(id);
    return index === -1 ? PREFERRED.length : index;
  };
  return models.toSorted((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
}

export default async function OrganizePage() {
  const session = await requireSession();
  if (session.openrouterKey === undefined) redirect("/start");

  const client = new SpotifyClient(session.accessToken);

  const [liked, models] = await Promise.all([
    client.savedTracksPage(0, 1),
    listStructuredOutputModels(session.openrouterKey).catch(() => []),
  ]);

  const choices = orderModels(
    models.map((model) => ({
      id: model.id,
      name: model.name,
      promptPerMillion: model.promptPerMillion,
    })),
  );

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/biblioteka" className="text-xs text-muted hover:text-foreground">
          ← Biblioteka
        </Link>

        <h1 className="mt-4 text-xl font-black">Zaproponuj playlisty</h1>
        <p className="mt-3 text-sm text-muted">
          Przeanalizuję {Math.min(liked.total, 1500).toLocaleString("pl-PL")} z{" "}
          {liked.total.toLocaleString("pl-PL")} polubionych utworów. Nic nie zostanie zapisane,
          dopóki nie zatwierdzisz propozycji.
        </p>

        <div className="mt-8">
          {choices.length === 0 ? (
            <Card>
              <p className="text-sm text-danger">
                Nie udało się pobrać listy modeli z OpenRouter. Sprawdź klucz w ustawieniach.
              </p>
            </Card>
          ) : (
            <OrganizePanel models={choices} likedCount={liked.total} />
          )}
        </div>
      </main>
      <AttributionFooter />
    </>
  );
}
