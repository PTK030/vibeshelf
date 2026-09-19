import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";
import type { ProviderId } from "@/lib/ai/providers";

const APP_HEADERS = {
  "HTTP-Referer": "https://github.com/PTK030/spotify-ai-organizer",
  "X-OpenRouter-Title": "Vibeshelf",
};

/*
 * Structured-output support on OpenRouter is per *endpoint*, not per model: the
 * same model served by another provider can quietly ignore response_format and
 * answer in prose. require_parameters routes around those, so it is mandatory.
 *
 * Anthropic and OpenAI are called directly, so there is no routing to guard.
 */
const OPENROUTER_ROUTING = {
  require_parameters: true,
  allow_fallbacks: true,
  data_collection: "deny",
} as const;

export interface GenerateOptions<T> {
  provider: ProviderId;
  apiKey: string;
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
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

export function resolveModel(provider: ProviderId, apiKey: string, model: string): LanguageModel {
  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(model);
  }

  if (provider === "openai") {
    return createOpenAI({ apiKey })(model);
  }

  return createOpenRouter({ apiKey, headers: APP_HEADERS }).chat(model, {
    extraBody: { provider: OPENROUTER_ROUTING },
  });
}

export async function generateStructured<T>(
  options: GenerateOptions<T>,
): Promise<GenerateResult<T>> {
  try {
    const result = await generateObject({
      model: resolveModel(options.provider, options.apiKey, options.model),
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
