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
    models: [
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", hint: "fast and cheap" },
      { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", hint: "balanced" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o mini", hint: "cheap" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", hint: "cheapest" },
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
    defaultModel: "claude-sonnet-4-5",
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", hint: "best all-round" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", hint: "fast and cheap" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", hint: "most capable" },
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
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o mini", hint: "fast and cheap" },
      { id: "gpt-4o", name: "GPT-4o", hint: "stronger" },
      { id: "o4-mini", name: "o4-mini", hint: "reasoning" },
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
