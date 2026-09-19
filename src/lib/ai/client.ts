import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import type { z } from "zod";

/*
 * Structured-output support on OpenRouter is per *endpoint*, not per model: the
 * same model served by a different provider may quietly ignore response_format
 * and answer in prose. require_parameters routes around those providers, so it
 * is not optional here.
 */
const PROVIDER_ROUTING = {
  require_parameters: true,
  allow_fallbacks: true,
  data_collection: "deny",
} as const;

export interface GenerateOptions<T> {
  apiKey: string;
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /* Tried in order if the primary model fails or is rate limited. */
  fallbackModels?: readonly string[];
  abortSignal?: AbortSignal;
}

export interface GenerateResult<T> {
  object: T;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}

export class AiCallError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "AiCallError";
    this.cause = cause;
  }
}

export async function generateStructured<T>(
  options: GenerateOptions<T>,
): Promise<GenerateResult<T>> {
  const openrouter = createOpenRouter({
    apiKey: options.apiKey,
    headers: {
      /* Attribution on OpenRouter's leaderboards; harmless if ignored. */
      "HTTP-Referer": "https://github.com/PTK030/spotify-ai-organizer",
      "X-OpenRouter-Title": "Vibeshelf",
    },
  });

  const model = openrouter.chat(options.model, {
    extraBody: {
      provider: PROVIDER_ROUTING,
      ...(options.fallbackModels === undefined || options.fallbackModels.length === 0
        ? {}
        : { models: [options.model, ...options.fallbackModels] }),
    },
  });

  try {
    const result = await generateObject({
      model,
      schema: options.schema,
      system: options.system,
      prompt: options.prompt,
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens,
      abortSignal: options.abortSignal,
    });

    return {
      object: result.object,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    };
  } catch (error) {
    throw new AiCallError(`Model ${options.model} failed to produce valid output.`, error);
  }
}
