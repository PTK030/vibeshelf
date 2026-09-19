import type { AudioFeatures } from "@/lib/enrichment/reccobeats";
import type { LyricsSignals } from "@/lib/enrichment/lyrics";

/* One track with everything we managed to gather. Every enrichment is optional. */
export interface EnrichedTrack {
  id: string;
  name: string;
  artistNames: string[];
  primaryArtistId: string | undefined;
  albumName: string;
  year: number | undefined;
  durationMs: number;
  isrc: string | undefined;
  imageUrl: string | undefined;
  spotifyUrl: string;
  addedAt: string;
  /* From the artist object; deprecated upstream, so often empty. */
  genres: string[];
  family: string;
  features: AudioFeatures | undefined;
  lyrics: LyricsSignals | undefined;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

/*
 * Deduplication key. A library full of "- 2011 Remaster" and "- Radio Edit"
 * variants otherwise spends tokens classifying the same song repeatedly.
 * ISRC is authoritative when present; the normalised title is the fallback.
 */
export function dedupKey(track: EnrichedTrack): string {
  if (track.isrc !== undefined) return track.isrc;
  return `${normaliseTitle(track.name)}|${track.primaryArtistId ?? track.artistNames[0] ?? ""}`;
}

/*
 * NFKD decomposes accents into combining marks, but a few Latin letters are
 * atomic code points with no decomposition — Polish "ł" among them. Without
 * this, "Zażółć" normalises to "zazołc" and stops matching.
 */
const ATOMIC_LETTERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ł/g, "l"],
  [/ø/g, "o"],
  [/đ/g, "d"],
  [/æ/g, "ae"],
  [/œ/g, "oe"],
  [/ß/g, "ss"],
];

export function normaliseTitle(title: string): string {
  let text = title
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "");
  for (const [pattern, replacement] of ATOMIC_LETTERS) {
    text = text.replaceAll(pattern, replacement);
  }

  return text
    .replaceAll(/\s*[-–]\s*\d{4}\s*(remaster(ed)?|version|mix)\b.*$/g, "")
    .replaceAll(/\s*[-–]\s*(remaster(ed)?|radio edit|single version|album version|live)\b.*$/g, "")
    .replaceAll(/\((feat|ft|with)\.?[^)]*\)/g, "")
    .replaceAll(/\[[^\]]*]/g, "")
    .replaceAll(/[^\p{L}\p{N}\s]/gu, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}
