import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { OrganizePanel, type ModelChoice } from "@/features/organize/organize-panel";
import { providerMeta } from "@/lib/ai/providers";
import { requireSession } from "@/lib/auth/require-session";
import { listStructuredOutputModels } from "@/lib/openrouter/client";
import { SpotifyClient } from "@/lib/spotify/client";

export const metadata: Metadata = { title: "Organizuj" };
export const dynamic = "force-dynamic";

/* Surfaced first among OpenRouter's several hundred structured-output models. */
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

export default async function OrganizePage(props: PageProps<"/organizuj">) {
  const search = await props.searchParams;
  const presetPrompt = typeof search.prompt === "string" ? search.prompt : undefined;

  const session = await requireSession();
  const ai = session.ai;
  if (ai === undefined) redirect("/start");

  const client = new SpotifyClient(session.accessToken);
  const meta = providerMeta(ai.provider);

  /*
   * Only OpenRouter has a catalogue worth fetching. Anthropic and OpenAI are a
   * short curated list, so they come from config and cost no request.
   */
  const [liked, openrouterModels] = await Promise.all([
    client.savedTracksPage(0, 1),
    ai.provider === "openrouter"
      ? listStructuredOutputModels(ai.key).catch(() => [])
      : Promise.resolve([]),
  ]);

  const choices: ModelChoice[] =
    ai.provider === "openrouter"
      ? orderModels(
          openrouterModels.map((model) => ({
            id: model.id,
            name: model.name,
            promptPerMillion: model.promptPerMillion,
          })),
        )
      : meta.models.map((model) => ({
          id: model.id,
          name: `${model.name} — ${model.hint}`,
          promptPerMillion: undefined,
        }));

  /* Keep the saved model selectable even if it is far down OpenRouter's list. */
  const ordered =
    choices.length === 0 || choices.some((choice) => choice.id === ai.model)
      ? choices
      : [{ id: ai.model, name: ai.model, promptPerMillion: undefined }, ...choices];

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href="/biblioteka"
          className="text-xs text-muted transition-colors duration-350 ease-smooth hover:text-foreground"
        >
          ← Biblioteka
        </Link>

        <h1 className="mt-4 text-xl font-bold">Zaproponuj playlisty</h1>
        <p className="mt-3 text-sm text-muted">
          Przeanalizuję {Math.min(liked.total, 1500).toLocaleString("pl-PL")} z{" "}
          {liked.total.toLocaleString("pl-PL")} polubionych utworów przez {meta.name}. Nic nie
          zostanie zapisane, dopóki nie zatwierdzisz propozycji.
        </p>

        <div className="mt-8">
          <OrganizePanel
            models={ordered}
            likedCount={liked.total}
            selectedModel={ai.model}
            presetPrompt={presetPrompt}
          />
        </div>
      </main>
      <AttributionFooter />
    </>
  );
}
