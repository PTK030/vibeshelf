import type { EnrichedTrack } from "@/lib/library/track";
import { formatDuration } from "@/lib/library/track";
import type { Taxonomy } from "@/lib/ai/schemas";

/*
 * Pipe-delimited lines, not JSON: roughly 32 tokens per track instead of ~60.
 * Across a few thousand tracks that difference decides whether a run costs
 * cents or dollars.
 *
 * Fields are omitted when unknown rather than sent empty, so the model can
 * tell "slow" from "we don't know".
 */
export function formatTrackLine(track: EnrichedTrack, index: number): string {
  const parts = [
    String(index),
    track.name,
    track.artistNames.join(" & "),
    track.year === undefined ? "?" : String(track.year),
    formatDuration(track.durationMs),
    track.genres.slice(0, 3).join(",") || "-",
  ];

  const features = track.features;
  if (features !== undefined) {
    const signals: string[] = [];
    if (features.tempo !== undefined) signals.push(`bpm${Math.round(features.tempo)}`);
    if (features.energy !== undefined) signals.push(`e${features.energy.toFixed(1)}`);
    if (features.valence !== undefined) signals.push(`v${features.valence.toFixed(1)}`);
    if (features.danceability !== undefined) signals.push(`d${features.danceability.toFixed(1)}`);
    if (signals.length > 0) parts.push(signals.join(" "));
  }

  if (track.lyrics !== undefined && track.lyrics.keywords.length > 0) {
    parts.push(`lyrics: ${track.lyrics.keywords.slice(0, 5).join(",")}`);
  }

  return parts.join("|");
}

export const TRACK_LINE_LEGEND =
  "# i|title|artist|year|length|genres|[bpm/energy e/mood v/danceability d]|[lyric keywords]";

export const TAXONOMY_SYSTEM = `You are a music curator. Given a sample of a user's library, you propose a set of themed playlists.

Rules:
- Playlist names in English, short and concrete ("For running", "Late evening"), never genre names and never "Playlist 1".
- Playlists must be mutually exclusive: a track should clearly belong to exactly one.
- Organise by situation and mood (running, studying, party, driving, evening), not by genre — the same genre belongs in different playlists depending on feel.
- Match the number of playlists to the size and variety of the library.
- estimatedShare is your guess at each playlist's share of the library; the total should be close to 1.
- Do not propose an "other" or "misc" category — the system adds one itself.`;

export interface TaxonomyPromptInput {
  totalTracks: number;
  genreHistogram: ReadonlyArray<readonly [string, number]>;
  decadeHistogram: ReadonlyArray<readonly [string, number]>;
  existingPlaylistNames: readonly string[];
  sample: readonly EnrichedTrack[];
  userPrompt: string | undefined;
}

export function buildTaxonomyPrompt(input: TaxonomyPromptInput): string {
  const genres = input.genreHistogram
    .slice(0, 60)
    .map(([genre, count]) => `${genre} (${count})`)
    .join(", ");

  const decades = input.decadeHistogram.map(([decade, count]) => `${decade}: ${count}`).join(", ");

  const sample = input.sample.map((track, index) => formatTrackLine(track, index)).join("\n");

  const sections = [
    `The library holds ${input.totalTracks} tracks.`,
    `Genres: ${genres || "no data"}.`,
    `Decades: ${decades || "no data"}.`,
  ];

  if (input.existingPlaylistNames.length > 0) {
    /* How the user already names things is the strongest hint about their taste. */
    sections.push(
      `Playlists the user made themselves: ${input.existingPlaylistNames.slice(0, 40).join(", ")}.`,
    );
  }

  if (input.userPrompt !== undefined && input.userPrompt.trim() !== "") {
    sections.push(`User's request (treat as the priority): "${input.userPrompt.trim()}"`);
  }

  sections.push(`Sample of tracks:\n${TRACK_LINE_LEGEND}\n${sample}`);

  return sections.join("\n\n");
}

export function buildClassifySystem(taxonomy: Taxonomy): string {
  const categories = taxonomy.playlists
    .map(
      (item) =>
        `- ${item.slug}: ${item.name}. ${item.vibe}` +
        (item.keepIf.length > 0 ? ` Fits: ${item.keepIf.join(", ")}.` : "") +
        (item.avoidIf.length > 0 ? ` Does not fit: ${item.avoidIf.join(", ")}.` : ""),
    )
    .join("\n");

  return `You assign tracks to a fixed set of playlists.

Categories:
${categories}
- _misc: none of the above clearly fits.

Rules:
- Every track goes to exactly one category. Use the index from the first column.
- Assign every index in the input; skip none.
- Never invent an index outside the given range.
- Use BPM, energy and mood where given; where absent, rely on what you know about the track.
- List any indices you are unsure about in lowConfidence as well.`;
}

export function buildClassifyPrompt(tracks: readonly EnrichedTrack[], familyHint: string): string {
  const lines = tracks.map((track, index) => formatTrackLine(track, index)).join("\n");
  const hint =
    familyHint === "unknown"
      ? "This batch has no genre data — rely on what you know about the tracks."
      : `This batch is mostly: ${familyHint}.`;

  return `${hint}\n\n${TRACK_LINE_LEGEND}\n${lines}`;
}

export const SCORING_SYSTEM = `You judge how well the proposed playlists match the user's taste.

Rules:
- score 0-100: how faithfully the playlist reflects how this person actually listens.
- reason: one sentence, specific, no platitudes.
- strengths and risks: short phrases, at most three each.
- Be honest: a playlist stitched together from unrelated tracks deserves a low score.`;
