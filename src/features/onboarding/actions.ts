"use server";

import { type ProviderId, ProviderIdSchema, providerMeta } from "@/lib/ai/providers";
import { validateProviderKey } from "@/lib/ai/validate-key";
import { redirect } from "next/navigation";
import { forgetAi, rememberAi } from "@/lib/auth/ai-store";
import { markOnboarded } from "@/lib/auth/onboarding";
import { readSession, writeSession } from "@/lib/auth/session";

export interface ConnectResult {
  ok: boolean;
  message: string;
  detail?: string;
}

/*
 * The key is stored in the same encrypted session cookie as the Spotify tokens
 * and never sent back to the browser.
 */
export async function connectProvider(
  rawProvider: string,
  key: string,
  model?: string,
): Promise<ConnectResult> {
  const parsedProvider = ProviderIdSchema.safeParse(rawProvider);
  if (!parsedProvider.success) {
    return { ok: false, message: "Unknown provider." };
  }

  const provider: ProviderId = parsedProvider.data;
  const trimmed = key.trim();
  if (trimmed === "") {
    return { ok: false, message: "Paste a key to continue." };
  }

  const session = await readSession();
  if (session === undefined) {
    return { ok: false, message: "Your session expired. Sign in with Spotify again." };
  }

  const check = await validateProviderKey(provider, trimmed);
  if (!check.ok) return check;

  const ai = { provider, key: trimmed, model: model ?? providerMeta(provider).defaultModel };

  await writeSession({ ...session, ai });
  /* Survives sign-out, so the next sign-in does not start from scratch. */
  await rememberAi(session.accountId, ai);

  return check;
}

export async function updateModel(model: string): Promise<ConnectResult> {
  const session = await readSession();
  if (session?.ai === undefined) {
    return { ok: false, message: "Connect an AI provider first." };
  }

  const ai = { ...session.ai, model };
  await writeSession({ ...session, ai });
  await rememberAi(session.accountId, ai);

  return { ok: true, message: "Model saved." };
}

export async function disconnectProvider(): Promise<void> {
  const session = await readSession();
  if (session === undefined) return;

  const { ai: _removed, ...rest } = session;
  await writeSession(rest);
  /* Disconnect is explicit, so forget it everywhere. */
  await forgetAi(session.accountId);
}

/*
 * Records that this account has seen the intro, then continues into the app.
 * A server action rather than a plain link because cookies can only be written
 * from an action or a route handler, never while rendering a page.
 */
export async function finishOnboarding(): Promise<void> {
  const session = await readSession();
  if (session !== undefined) await markOnboarded(session.accountId);

  redirect("/library");
}
