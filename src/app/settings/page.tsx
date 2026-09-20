import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { Card } from "@/components/ui/card";
import { Stagger, StaggerItem } from "@/components/ui/stagger";
import type { ModelChoice } from "@/features/settings/model-picker";
import { SettingsPanel } from "@/features/settings/settings-panel";
import { maskKey } from "@/lib/ai/mask-key";
import { providerMeta } from "@/lib/ai/providers";
import type { Session } from "@/lib/auth/session";
import { listStructuredOutputModels } from "@/lib/openrouter/client";
import { requireSession } from "@/lib/auth/require-session";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/* Spotify refresh tokens expire six months after the original consent. */
const CONSENT_DAYS = 180;

export default async function SettingsPage() {
  const session = await requireSession();

  const ai = session.ai;

  /*
   * OpenRouter has a live catalogue worth showing — several hundred models, a
   * handful of them free. The other providers are a short curated list and
   * cost no request.
   */
  const models: ModelChoice[] = await loadModels(ai);

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

        <Stagger>
          <StaggerItem>
            <h1 className="mt-4 mb-10 text-xl font-bold">Settings</h1>
          </StaggerItem>

          <StaggerItem>
            <SettingsPanel
              connected={ai?.provider}
              model={ai?.model}
              models={models}
              maskedKey={ai === undefined ? undefined : maskKey(ai.key)}
            />
          </StaggerItem>

          <StaggerItem className="mt-10">
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
          </StaggerItem>
        </Stagger>
      </main>

      <AttributionFooter />
    </>
  );
}

async function loadModels(ai: Session["ai"]): Promise<ModelChoice[]> {
  if (ai === undefined) return [];

  if (ai.provider === "openrouter") {
    const live = await listStructuredOutputModels(ai.key).catch(() => []);
    return live.map((model) => ({
      id: model.id,
      name: model.name,
      isFree: model.isFree,
      promptPerMillion: model.promptPerMillion,
      contextLength: model.contextLength,
    }));
  }

  return providerMeta(ai.provider).models.map((model) => ({
    id: model.id,
    name: `${model.name} — ${model.hint}`,
    isFree: false,
    promptPerMillion: undefined,
    contextLength: undefined,
  }));
}
