import { z } from "zod";

const API_BASE = "https://openrouter.ai/api/v1";

/*
 * GET /key is the cheapest way to validate a user-supplied key: 200 means the
 * key works and hands back its limits, 401 means reject. No tokens burned on a
 * throwaway completion. (GET /credits would 403 — it needs a management key.)
 */
const KeyInfoSchema = z.object({
  data: z.object({
    label: z.string().nullable().optional(),
    usage: z.number().optional(),
    limit: z.number().nullable().optional(),
    limit_remaining: z.number().nullable().optional(),
    is_free_tier: z.boolean().optional(),
  }),
});

export interface KeyInfo {
  label: string | undefined;
  usage: number | undefined;
  limitRemaining: number | undefined;
  isFreeTier: boolean;
}

export class InvalidOpenRouterKeyError extends Error {
  constructor() {
    super("OpenRouter rejected this API key.");
    this.name = "InvalidOpenRouterKeyError";
  }
}

export async function validateKey(key: string): Promise<KeyInfo> {
  const response = await fetch(`${API_BASE}/key`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (response.status === 401) throw new InvalidOpenRouterKeyError();
  if (!response.ok) {
    throw new Error(`OpenRouter /key returned ${response.status}`);
  }

  const parsed = KeyInfoSchema.parse(await response.json());
  return {
    label: parsed.data.label ?? undefined,
    usage: parsed.data.usage,
    limitRemaining: parsed.data.limit_remaining ?? undefined,
    isFreeTier: parsed.data.is_free_tier ?? false,
  };
}

const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  context_length: z.number().optional(),
  pricing: z
    .object({
      /* Strings, and priced per single token — not per million. */
      prompt: z.string().optional(),
      completion: z.string().optional(),
    })
    .optional(),
  supported_parameters: z.array(z.string()).optional(),
});

const ModelsSchema = z.object({ data: z.array(ModelSchema) });

export interface ModelOption {
  id: string;
  name: string;
  contextLength: number | undefined;
  /* Converted to dollars per million tokens, which is how people think. */
  promptPerMillion: number | undefined;
  completionPerMillion: number | undefined;
  /* Free tier: either the :free suffix or zero on both sides of the price. */
  isFree: boolean;
}

function perMillion(price: string | undefined): number | undefined {
  if (price === undefined) return undefined;
  const value = Number(price);
  return Number.isFinite(value) ? value * 1_000_000 : undefined;
}

/*
 * Only models that can be held to a JSON schema. Structured output support is
 * per endpoint, not per model, so requests must also send
 * `provider: { require_parameters: true }`.
 */
export async function listStructuredOutputModels(key: string): Promise<ModelOption[]> {
  const response = await fetch(`${API_BASE}/models?supported_parameters=structured_outputs`, {
    headers: { Authorization: `Bearer ${key}` },
    next: { revalidate: 3600 },
  });

  if (!response.ok) throw new Error(`OpenRouter /models returned ${response.status}`);

  const parsed = ModelsSchema.parse(await response.json());
  return parsed.data.map((model) => {
    const promptPerMillion = perMillion(model.pricing?.prompt);
    const completionPerMillion = perMillion(model.pricing?.completion);

    return {
      id: model.id,
      name: model.name,
      contextLength: model.context_length,
      promptPerMillion,
      completionPerMillion,
      isFree: model.id.endsWith(":free") || (promptPerMillion === 0 && completionPerMillion === 0),
    };
  });
}
