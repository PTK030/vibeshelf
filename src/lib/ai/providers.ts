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
    blurb: "One key, hundreds of models. The simplest start.",
    keyLabel: "OpenRouter key",
    keyPrefix: "sk-or-",
    keyUrl: "https://openrouter.ai/keys",
    supportsOauth: true,
    defaultModel: "google/gemini-2.5-flash",
    /* Fallback only; the live catalogue replaces this wherever it loads. */
    models: [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", hint: "fast and cheap" },
      { id: "openai/gpt-5-nano", name: "GPT-5 nano", hint: "cheapest" },
      { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", hint: "cheap, long context" },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Claude (Anthropic)",
    blurb: "Directly through the Anthropic Console.",
    keyLabel: "Anthropic key",
    keyPrefix: "sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
    supportsOauth: false,
    oauthNote:
      "Anthropic does not allow third-party apps to sign in with a Claude Pro/Max account — a Console key is required.",
    defaultModel: "claude-haiku-4-5",
    models: [
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", hint: "fastest, cheapest" },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5", hint: "best all-round" },
      { id: "claude-opus-5", name: "Claude Opus 5", hint: "most capable" },
    ],
  },
  openai: {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    blurb: "Directly through platform.openai.com.",
    keyLabel: "OpenAI key",
    keyPrefix: "sk-",
    keyUrl: "https://platform.openai.com/api-keys",
    supportsOauth: false,
    oauthNote:
      "“Sign in with ChatGPT” currently only ships inside Codex tooling, so an API key is needed.",
    defaultModel: "gpt-5-nano",
    models: [
      { id: "gpt-5-nano", name: "GPT-5 nano", hint: "fastest, cheapest" },
      { id: "gpt-5-mini", name: "GPT-5 mini", hint: "balanced" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 nano", hint: "long context" },
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
