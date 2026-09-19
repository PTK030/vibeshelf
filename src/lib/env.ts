import { z } from "zod";

/*
 * Validated lazily rather than at import time: `next build` imports modules
 * without a populated environment, and we do not want the build to depend on
 * deployment secrets being present.
 */
const ServerEnvSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.url(),
  OPENROUTER_REDIRECT_URI: z.url(),
  /* 32 bytes, base64-encoded. */
  ENCRYPTION_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  JOB_RUNNER_SECRET: z.string().min(16),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached !== undefined) return cached;

  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${missing}. See .env.example.`);
  }

  cached = parsed.data;
  return cached;
}
