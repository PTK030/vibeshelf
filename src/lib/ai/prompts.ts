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
    parts.push(`tekst: ${track.lyrics.keywords.slice(0, 5).join(",")}`);
  }

  return parts.join("|");
}

export const TRACK_LINE_LEGEND =
  "# i|tytul|wykonawca|rok|dlugosc|gatunki|[bpm/energia e/nastroj v/tanecznosc d]|[slowa z tekstu]";

export const TAXONOMY_SYSTEM = `Jesteś kuratorem muzycznym. Na podstawie próbki biblioteki użytkownika proponujesz zestaw playlist tematycznych.

Zasady:
- Nazwy playlist po polsku, krótkie i konkretne ("Do biegania", "Wieczorny spokój"), nigdy nazwy gatunków ani "Playlista 1".
- Playlisty mają się wzajemnie wykluczać: utwór ma pasować wyraźnie do jednej.
- Opieraj się na sytuacji i nastroju (bieganie, nauka, impreza, jazda, wieczór), nie na samym gatunku — te same gatunki trafiają do różnych playlist.
- Dobierz liczbę playlist do wielkości i różnorodności biblioteki.
- estimatedShare to zgadywany udział w bibliotece; suma powinna być bliska 1.
- Nie proponuj kategorii "inne" ani "różne" — system dodaje ją sam.`;

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
    `Biblioteka liczy ${input.totalTracks} utworów.`,
    `Gatunki: ${genres || "brak danych"}.`,
    `Dekady: ${decades || "brak danych"}.`,
  ];

  if (input.existingPlaylistNames.length > 0) {
    /* How the user already names things is the strongest hint about their taste. */
    sections.push(
      `Playlisty, które użytkownik stworzył sam: ${input.existingPlaylistNames.slice(0, 40).join(", ")}.`,
    );
  }

  if (input.userPrompt !== undefined && input.userPrompt.trim() !== "") {
    sections.push(`Życzenie użytkownika (traktuj priorytetowo): "${input.userPrompt.trim()}"`);
  }

  sections.push(`Próbka utworów:\n${TRACK_LINE_LEGEND}\n${sample}`);

  return sections.join("\n\n");
}

export function buildClassifySystem(taxonomy: Taxonomy): string {
  const categories = taxonomy.playlists
    .map(
      (item) =>
        `- ${item.slug}: ${item.name}. ${item.vibe}` +
        (item.keepIf.length > 0 ? ` Pasuje: ${item.keepIf.join(", ")}.` : "") +
        (item.avoidIf.length > 0 ? ` Nie pasuje: ${item.avoidIf.join(", ")}.` : ""),
    )
    .join("\n");

  return `Przypisujesz utwory do z góry ustalonych playlist.

Kategorie:
${categories}
- _misc: nic z powyższych nie pasuje wyraźnie.

Zasady:
- Każdy utwór trafia dokładnie do jednej kategorii. Używaj indeksów z pierwszej kolumny.
- Przypisz każdy indeks z wejścia, żadnego nie pomiń.
- Nie wymyślaj indeksów spoza zakresu.
- Kieruj się BPM, energią i nastrojem, jeśli są podane; gdy ich brak, korzystaj z wiedzy o utworze.
- Indeksy, co do których masz wątpliwości, wypisz dodatkowo w lowConfidence.`;
}

export function buildClassifyPrompt(tracks: readonly EnrichedTrack[], familyHint: string): string {
  const lines = tracks.map((track, index) => formatTrackLine(track, index)).join("\n");
  const hint =
    familyHint === "unknown"
      ? "Ta paczka nie ma danych o gatunkach — opieraj się na swojej wiedzy o utworach."
      : `Ta paczka to głównie: ${familyHint}.`;

  return `${hint}\n\n${TRACK_LINE_LEGEND}\n${lines}`;
}

export const SCORING_SYSTEM = `Oceniasz, jak dobrze zaproponowane playlisty pasują do gustu użytkownika.

Zasady:
- score 0-100: jak trafnie playlista oddaje realny sposób słuchania tej osoby.
- reason: jedno zdanie po polsku, konkretnie, bez ogólników.
- strengths i risks: krótkie hasła, maksymalnie trzy każde.
- Bądź szczery: playlista sklejona z przypadkowych utworów ma dostać niski wynik.`;
