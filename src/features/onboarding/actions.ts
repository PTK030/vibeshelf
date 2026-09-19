"use server";

import { type ProviderId, ProviderIdSchema, providerMeta } from "@/lib/ai/providers";
import { validateProviderKey } from "@/lib/ai/validate-key";
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
    return { ok: false, message: "Nieznany dostawca." };
  }

  const provider: ProviderId = parsedProvider.data;
  const trimmed = key.trim();
  if (trimmed === "") {
    return { ok: false, message: "Wklej klucz, żeby przejść dalej." };
  }

  const session = await readSession();
  if (session === undefined) {
    return { ok: false, message: "Sesja wygasła. Zaloguj się ponownie przez Spotify." };
  }

  const check = await validateProviderKey(provider, trimmed);
  if (!check.ok) return check;

  await writeSession({
    ...session,
    ai: {
      provider,
      key: trimmed,
      model: model ?? providerMeta(provider).defaultModel,
    },
  });

  return check;
}

export async function updateModel(model: string): Promise<ConnectResult> {
  const session = await readSession();
  if (session?.ai === undefined) {
    return { ok: false, message: "Najpierw podłącz dostawcę AI." };
  }

  await writeSession({ ...session, ai: { ...session.ai, model } });
  return { ok: true, message: "Model zapisany." };
}

export async function disconnectProvider(): Promise<void> {
  const session = await readSession();
  if (session === undefined) return;

  const { ai: _removed, ...rest } = session;
  await writeSession(rest);
}
