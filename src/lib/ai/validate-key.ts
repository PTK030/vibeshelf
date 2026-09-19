import { type ProviderId, looksLikeKey } from "@/lib/ai/providers";

export interface KeyCheck {
  ok: boolean;
  message: string;
  /* Filled in when the provider tells us something worth showing. */
  detail?: string;
}

/*
 * A cheap, read-only call per provider that proves the key works without
 * spending tokens on a throwaway completion.
 */
export async function validateProviderKey(provider: ProviderId, key: string): Promise<KeyCheck> {
  const trimmed = key.trim();

  if (!looksLikeKey(provider, trimmed)) {
    return { ok: false, message: "Ten klucz nie wygląda na klucz tego dostawcy." };
  }

  try {
    if (provider === "openrouter") return await checkOpenRouter(trimmed);
    if (provider === "openai") return await checkOpenAI(trimmed);
    return await checkAnthropic(trimmed);
  } catch {
    return { ok: false, message: "Nie udało się połączyć z dostawcą. Spróbuj ponownie." };
  }
}

async function checkOpenRouter(key: string): Promise<KeyCheck> {
  const response = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (response.status === 401) return { ok: false, message: "OpenRouter odrzucił ten klucz." };
  if (!response.ok) return { ok: false, message: `OpenRouter zwrócił błąd ${response.status}.` };

  const body = (await response.json()) as {
    data?: { is_free_tier?: boolean; limit_remaining?: number | null };
  };

  return {
    ok: true,
    message: "Klucz działa.",
    detail:
      body.data?.is_free_tier === true
        ? "Konto na darmowym progu — wystarczy na pierwsze przebiegi."
        : undefined,
  };
}

async function checkOpenAI(key: string): Promise<KeyCheck> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (response.status === 401) return { ok: false, message: "OpenAI odrzucił ten klucz." };
  if (response.status === 429) {
    return { ok: false, message: "Klucz jest poprawny, ale konto nie ma dostępnego limitu." };
  }
  if (!response.ok) return { ok: false, message: `OpenAI zwrócił błąd ${response.status}.` };

  return { ok: true, message: "Klucz działa." };
}

async function checkAnthropic(key: string): Promise<KeyCheck> {
  /*
   * Anthropic has no free "whoami" endpoint, but /v1/models is a plain GET and
   * costs nothing. It needs the version header like every other call.
   */
  const response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: "Anthropic odrzucił ten klucz." };
  }
  if (!response.ok) return { ok: false, message: `Anthropic zwrócił błąd ${response.status}.` };

  return { ok: true, message: "Klucz działa." };
}
