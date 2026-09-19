import { genreFamily } from "@/lib/ai/genre-families";

export interface TasteInput {
  likedTotal: number;
  playlistTotal: number;
  topArtistNames: string[];
  topArtistGenres: string[][];
}

export interface Insight {
  title: string;
  body: string;
  tone: "neutral" | "accent" | "warning";
}

/*
 * Derived locally from three cheap Spotify calls — no model involved.
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
            title: "Masz wyraźny rdzeń",
            body: `Większość Twoich ulubionych artystów to ${FAMILY_LABELS[dominant[0]] ?? dominant[0]}. Playlisty warto różnicować nastrojem, nie gatunkiem.`,
            tone: "accent",
          }
        : {
            title: "Słuchasz szeroko",
            body: `Twoi ulubieni artyści rozkładają się na ${breadth} różnych obszarów. Podział po nastroju wypadnie lepiej niż po gatunku.`,
            tone: "accent",
          },
    );
  }

  /* A large library with few playlists is the case this app exists for. */
  const perPlaylist = input.playlistTotal === 0 ? Infinity : input.likedTotal / input.playlistTotal;
  if (input.likedTotal >= 200 && perPlaylist > 20) {
    insights.push({
      title: "Polubione rosną szybciej niż playlisty",
      body: `${input.likedTotal.toLocaleString("pl-PL")} utworów i tylko ${input.playlistTotal} playlist. Sporo z tego pewnie nigdy nie wraca.`,
      tone: "warning",
    });
  }

  if (input.topArtistNames.length > 0) {
    insights.push({
      title: "Ostatnio najczęściej",
      body: input.topArtistNames.slice(0, 4).join(", ") + ".",
      tone: "neutral",
    });
  }

  if (input.likedTotal > 1500) {
    insights.push({
      title: "Duża biblioteka",
      body: "Analiza obejmie 1500 najstarszych polubionych — reszta poczeka na kolejny przebieg.",
      tone: "neutral",
    });
  }

  return insights;
}

const FAMILY_LABELS: Record<string, string> = {
  metal: "metal",
  punk: "punk i hardcore",
  rock: "rock",
  indie: "indie",
  electronic: "elektronika",
  ambient: "ambient",
  hiphop: "hip-hop",
  rnb: "R&B i soul",
  pop: "pop",
  jazz: "jazz",
  classical: "klasyka",
  folk: "folk i country",
  latin: "muzyka latynoska",
  reggae: "reggae",
  blues: "blues",
  world: "muzyka świata",
  soundtrack: "ścieżki dźwiękowe",
  experimental: "eksperyment",
  chill: "chillout",
};
