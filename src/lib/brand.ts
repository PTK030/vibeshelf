/*
 * Single place the product name lives.
 *
 * Spotify's Developer Policy forbids an app name that contains "Spotify" or
 * begins with "Spot". "Vibeshelf" satisfies both. The repository is called
 * spotify-ai-organizer, but the public name — and the one registered in the
 * Spotify Developer Dashboard — must come from here.
 */
export const BRAND = {
  name: "Vibeshelf",
  tagline: "Twoja biblioteka, poukładana",
  description:
    "Grupuje polubione utwory w playlisty tematyczne przy pomocy wybranego przez Ciebie modelu AI.",
  /* Required by Developer Policy II.1 — must be visible to users. */
  disclaimer: "Niezwiązane z Spotify AB.",
} as const;
