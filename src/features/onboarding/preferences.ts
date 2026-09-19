import { z } from "zod";

/*
 * UI preferences only — per-viewer conveniences, so localStorage is the right
 * home. Anything the server must trust lives in the session cookie instead.
 */
export const PreferencesSchema = z.object({
  /* Live suggestions while you browse, rather than only on an explicit run. */
  realtimeSuggestions: z.boolean(),
  /*
   * Pulls BPM/energy/valence from ReccoBeats and lyrics from lyrics.ovh to
   * sharpen sorting. Both are free and keyless, but they add requests, so it
   * is opt-out rather than forced.
   */
  deepAnalysis: z.boolean(),
  /* Score how well each playlist matches your listening profile. */
  playlistScoring: z.boolean(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  realtimeSuggestions: true,
  deepAnalysis: true,
  playlistScoring: true,
};

const STORAGE_KEY = "vibeshelf.preferences";

export function loadPreferences(): Preferences {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return DEFAULT_PREFERENCES;

    const parsed = PreferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  } catch {
    /* Private windows and blocked site data both throw here. */
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* Persisting preferences is a nicety; never break the flow over it. */
  }
}
