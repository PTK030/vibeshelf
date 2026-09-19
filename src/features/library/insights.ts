import { genreFamily } from "@/lib/ai/genre-families";

export interface TasteInput {
  likedTotal: number;
  playlistTotal: number;
  topArtistGenres: string[][];
}

export interface Insight {
  title: string;
  body: string;
  tone: "neutral" | "accent" | "warning";
}

/*
 * Derived locally from a few cheap Spotify calls — no model involved.
 *
 * Deliberate: the landing surface of the app should say something true about
 * the user's library immediately, for free, rather than waiting on an AI call
 * they have to pay for. The paid analysis is one click away from here.
 */
export function buildInsights(input: TasteInput): Insight[] {
  const insights: Insight[] = [];

  const families = new Map<string, number>();
  for (const genres of input.topArtistGenres) {
    const family = genreFamily(genres);
    if (family === "unknown") continue;
    families.set(family, (families.get(family) ?? 0) + 1);
  }

  const ranked = [...families.entries()].toSorted((a, b) => b[1] - a[1]);
  const dominant = ranked[0];
  const breadth = ranked.length;

  if (dominant !== undefined && input.topArtistGenres.length > 0) {
    const share = dominant[1] / input.topArtistGenres.length;
    insights.push(
      share > 0.6
        ? {
            title: "You have a clear core",
            body: `Most of your favourite artists sit in ${FAMILY_LABELS[dominant[0]] ?? dominant[0]}. Splitting by mood will work better than splitting by genre.`,
            tone: "accent",
          }
        : {
            title: "You listen broadly",
            body: `Your favourite artists spread across ${breadth} different areas. Grouping by mood will read better than grouping by genre.`,
            tone: "accent",
          },
    );
  }

  /* A large library with few playlists is the case this app exists for. */
  const perPlaylist = input.playlistTotal === 0 ? Infinity : input.likedTotal / input.playlistTotal;
  if (input.likedTotal >= 200 && perPlaylist > 20) {
    insights.push({
      title: "Likes are outgrowing your playlists",
      body: `${input.likedTotal.toLocaleString("en-GB")} tracks and only ${input.playlistTotal} playlists. A lot of that probably never comes back around.`,
      tone: "warning",
    });
  }

  if (input.likedTotal > 1500) {
    insights.push({
      title: "Large library",
      body: "The analysis covers the 1500 oldest likes — the rest waits for another run.",
      tone: "neutral",
    });
  }

  return insights;
}

const FAMILY_LABELS: Record<string, string> = {
  metal: "metal",
  punk: "punk and hardcore",
  rock: "rock",
  indie: "indie",
  electronic: "electronic",
  ambient: "ambient",
  hiphop: "hip-hop",
  rnb: "R&B and soul",
  pop: "pop",
  jazz: "jazz",
  classical: "classical",
  folk: "folk and country",
  latin: "latin",
  reggae: "reggae",
  blues: "blues",
  world: "world music",
  soundtrack: "soundtracks",
  experimental: "experimental",
  chill: "chillout",
};
