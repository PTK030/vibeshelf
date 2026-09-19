"use server";

import { readSession, writeSession } from "@/lib/auth/session";
import { InvalidOpenRouterKeyError, validateKey } from "@/lib/openrouter/client";

export interface SaveKeyResult {
  ok: boolean;
  message: string;
}

/*
 * The key lives in the same encrypted session cookie as the Spotify tokens and
 * is never sent back to the browser — only its last four characters are.
 */
export async function saveOpenrouterKey(key: string): Promise<SaveKeyResult> {
  const trimmed = key.trim();

  if (trimmed === "") {
    return { ok: false, message: "Wklej klucz, żeby przejść dalej." };
  }

  const session = await readSession();
  if (session === undefined) {
    return { ok: false, message: "Sesja wygasła. Zaloguj się ponownie przez Spotify." };
  }

  try {
    const info = await validateKey(trimmed);
    await writeSession({ ...session, openrouterKey: trimmed });

    return {
      ok: true,
      message: info.isFreeTier
        ? "Klucz działa. Konto korzysta z darmowego progu — starczy na pierwsze przebiegi."
        : "Klucz działa.",
    };
  } catch (error) {
    if (error instanceof InvalidOpenRouterKeyError) {
      return { ok: false, message: "OpenRouter odrzucił ten klucz. Sprawdź, czy jest aktywny." };
    }
    return { ok: false, message: "Nie udało się połączyć z OpenRouter. Spróbuj ponownie." };
  }
}
