import { z } from "zod";

/*
 * Which AI backend the user brings.
 *
 * On OAuth, for the record: Anthropic explicitly banned third-party apps from
 * using Claude Free/Pro/Max OAuth tokens in February 2026 and enforces it
 * server-side, so "sign in with Claude" is not available to us — a Console API
 * key is the only sanctioned route. OpenAI's "Sign in with ChatGPT" exists but
 * still only ships inside Codex tooling. OpenRouter is therefore the one
 * provider here that can offer a real OAuth flow.
 */
export const PROVIDER_IDS = ["openrouter", "anthropic", "openai"] as const;

export const ProviderIdSchema = z.enum(PROVIDER_IDS);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  /* Shown under the name when choosing. */
  blurb: string;
  keyLabel: string;
  keyPrefix: string;
  keyUrl: string;
  supportsOauth: boolean;
  /* Why OAuth is unavailable, when it is. Shown in the UI, not hidden. */
  oauthNote?: string;
  defaultModel: string;
  /* Offered without calling the provider's model list. */
  models: ReadonlyArray<{ id: string; name: string; hint: string }>;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    blurb: "Jeden klucz, setki modeli. Najprostszy start.",
    keyLabel: "Klucz OpenRouter",
    keyPrefix: "sk-or-",
    keyUrl: "https://openrouter.ai/keys",
    supportsOauth: true,
    defaultModel: "google/gemini-2.5-flash",
    models: [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", hint: "szybki i tani" },
      { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", hint: "równowaga" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o mini", hint: "tani" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", hint: "bardzo tani" },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Claude (Anthropic)",
    blurb: "Bezpośrednio przez Anthropic Console.",
    keyLabel: "Klucz Anthropic",
    keyPrefix: "sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
    supportsOauth: false,
    oauthNote:
      "Anthropic nie pozwala aplikacjom zewnętrznym logować się kontem Claude Pro/Max — wymagany jest klucz z Console.",
    defaultModel: "claude-sonnet-4-5",
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", hint: "najlepszy stosunek jakości" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", hint: "szybki i tani" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", hint: "najmocniejszy" },
    ],
  },
  openai: {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    blurb: "Bezpośrednio przez platform.openai.com.",
    keyLabel: "Klucz OpenAI",
    keyPrefix: "sk-",
    keyUrl: "https://platform.openai.com/api-keys",
    supportsOauth: false,
    oauthNote:
      "„Zaloguj przez ChatGPT” działa na razie tylko w narzędziach Codex, więc potrzebny jest klucz API.",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o mini", hint: "szybki i tani" },
      { id: "gpt-4o", name: "GPT-4o", hint: "mocniejszy" },
      { id: "o4-mini", name: "o4-mini", hint: "rozumowanie" },
    ],
  },
};

export function providerMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS[id];
}

/*
 * Cheap shape check before spending a network call. Not security — just so an
 * obviously wrong paste fails immediately with a useful message.
 */
export function looksLikeKey(provider: ProviderId, key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;

  /* OpenAI keys also start with sk-, so only reject a clear mismatch. */
  if (provider === "anthropic") return trimmed.startsWith("sk-ant-");
  if (provider === "openrouter") return trimmed.startsWith("sk-or-");
  return trimmed.startsWith("sk-");
}
