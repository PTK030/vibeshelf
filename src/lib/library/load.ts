import { genreFamily } from "@/lib/ai/genre-families";
import { fetchAudioFeatures } from "@/lib/enrichment/reccobeats";
import { fetchLyricsSignals } from "@/lib/enrichment/lyrics";
import { type EnrichedTrack, dedupKey } from "@/lib/library/track";
import type { SpotifyClient } from "@/lib/spotify/client";

export interface LoadProgress {
  phase: "liked" | "artists" | "features" | "lyrics";
  done: number;
  total: number;
  note?: string;
}

/* Where the tracks come from: the whole library, or one playlist. */
export type LoadSource = { kind: "liked" } | { kind: "playlist"; playlistId: string };

export interface LoadOptions {
  source?: LoadSource;
  maxTracks?: number;
  /* Ceiling on artist lookups — one request each since batching was removed. */
  maxArtistLookups?: number;
  /* Stop fetching artists once this share of tracks has genre data. */
  targetGenreCoverage?: number;
  deepAnalysis?: boolean;
  lyricsSampleSize?: number;
  onProgress?: (progress: LoadProgress) => void;
  signal?: AbortSignal;
}

export interface LibrarySnapshot {
  tracks: EnrichedTrack[];
  totalLiked: number;
  duplicatesRemoved: number;
  genreCoverage: number;
  /* True when genres were so sparse that we stopped asking for them. */
  nameOnlyMode: boolean;
  featureCoverage: number;
}

const PAGE_SIZE = 50;

function yearFrom(releaseDate: string | null | undefined): number | undefined {
  if (releaseDate === null || releaseDate === undefined) return undefined;
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

type SavedItems = Awaited<ReturnType<SpotifyClient["savedTracksPage"]>>["items"];

function collectPage(into: EnrichedTrack[], items: SavedItems): void {
  for (const item of items) {
    const track = item.track;
    /* Local files and region-removed items come back as null. */
    if (track === null || track.id === null) continue;

    into.push({
      id: track.id,
      name: track.name,
      artistNames: track.artists.map((artist) => artist.name),
      primaryArtistId: track.artists[0]?.id ?? undefined,
      albumName: track.album.name,
      year: yearFrom(track.album.release_date),
      durationMs: track.duration_ms,
      isrc: track.external_ids?.isrc,
      imageUrl: track.album.images?.[0]?.url,
      spotifyUrl: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
      addedAt: item.added_at,
      genres: [],
      family: "unknown",
      features: undefined,
      lyrics: undefined,
    });
  }
}

interface GenreResult {
  covered: number;
  nameOnlyMode: boolean;
}

async function fetchLikedTracks(
  client: SpotifyClient,
  wanted: number,
  report: (progress: LoadProgress) => void,
  signal: AbortSignal | undefined,
  firstPage: Awaited<ReturnType<SpotifyClient["savedTracksPage"]>>,
): Promise<EnrichedTrack[]> {
  const raw: EnrichedTrack[] = [];
  collectPage(raw, firstPage.items);
  report({ phase: "liked", done: raw.length, total: wanted });

  /* eslint-disable no-await-in-loop -- paged sequentially so the limiter paces us. */
  for (let offset = PAGE_SIZE; offset < wanted; offset += PAGE_SIZE) {
    if (signal?.aborted === true) break;

    const page = await client.savedTracksPage(offset, PAGE_SIZE);
    collectPage(raw, page.items);
    report({ phase: "liked", done: raw.length, total: wanted });

    if (page.next === null) break;
  }
  /* eslint-enable no-await-in-loop */

  return raw;
}

/* Same shape as the liked-songs walk, against one playlist. */
async function fetchPlaylistTracks(
  client: SpotifyClient,
  playlistId: string,
  wanted: number,
  report: (progress: LoadProgress) => void,
  signal: AbortSignal | undefined,
  firstPage: Awaited<ReturnType<SpotifyClient["playlistItemsPage"]>>,
): Promise<EnrichedTrack[]> {
  const raw: EnrichedTrack[] = [];
  const collect = (page: typeof firstPage) => {
    collectPage(
      raw,
      page.items.map((entry) => ({
        added_at: entry.added_at ?? new Date(0).toISOString(),
        track: entry.item,
      })),
    );
  };

  collect(firstPage);
  report({ phase: "liked", done: raw.length, total: wanted });

  /* eslint-disable no-await-in-loop -- paged sequentially so the limiter paces us. */
  for (let offset = PAGE_SIZE; offset < wanted; offset += PAGE_SIZE) {
    if (signal?.aborted === true) break;

    const page = await client.playlistItemsPage(playlistId, offset, PAGE_SIZE);
    collect(page);
    report({ phase: "liked", done: raw.length, total: wanted });

    if (page.next === null) break;
  }
  /* eslint-enable no-await-in-loop */

  return raw;
}

function deduplicate(raw: readonly EnrichedTrack[]): EnrichedTrack[] {
  const seen = new Set<string>();
  const tracks: EnrichedTrack[] = [];

  for (const track of raw) {
    const key = dedupKey(track);
    if (seen.has(key)) continue;
    seen.add(key);
    tracks.push(track);
  }

  return tracks;
}

function groupByPrimaryArtist(tracks: readonly EnrichedTrack[]): Map<string, EnrichedTrack[]> {
  const byArtist = new Map<string, EnrichedTrack[]>();

  for (const track of tracks) {
    if (track.primaryArtistId === undefined) continue;
    const bucket = byArtist.get(track.primaryArtistId);
    if (bucket === undefined) byArtist.set(track.primaryArtistId, [track]);
    else bucket.push(track);
  }

  return byArtist;
}

async function enrichGenres(
  client: SpotifyClient,
  tracks: readonly EnrichedTrack[],
  options: LoadOptions,
  report: (progress: LoadProgress) => void,
): Promise<GenreResult> {
  const maxLookups = options.maxArtistLookups ?? 400;
  const targetCoverage = options.targetGenreCoverage ?? 0.8;

  /* Most-played artists first: the distribution is Zipfian, so the head covers
     most of the library and the tail costs requests for almost nothing. */
  const ranked = [...groupByPrimaryArtist(tracks).entries()].toSorted(
    (a, b) => b[1].length - a[1].length,
  );

  let lookups = 0;
  let covered = 0;
  let emptyGenres = 0;

  /* eslint-disable no-await-in-loop -- one request per artist, paced by the limiter. */
  for (const [artistId, artistTracks] of ranked) {
    if (options.signal?.aborted === true) break;
    if (lookups >= maxLookups) break;
    if (tracks.length > 0 && covered / tracks.length >= targetCoverage) break;

    try {
      const genres = (await client.artist(artistId)).genres ?? [];
      if (genres.length === 0) emptyGenres += 1;

      const family = genreFamily(genres);
      for (const track of artistTracks) {
        track.genres = genres;
        track.family = family;
      }
      covered += artistTracks.length;
    } catch {
      /* A single missing artist is not worth failing the run over. */
    }

    lookups += 1;
    report({ phase: "artists", done: lookups, total: Math.min(ranked.length, maxLookups) });

    /*
     * `genres` is deprecated upstream. When it comes back mostly empty there is
     * nothing to gain from hundreds more requests — fall back to the model's
     * own knowledge of the tracks instead.
     */
    if (lookups >= 100 && emptyGenres / lookups > 0.4) {
      report({ phase: "artists", done: lookups, total: lookups, note: "name_only" });
      return { covered, nameOnlyMode: true };
    }
  }
  /* eslint-enable no-await-in-loop */

  return { covered, nameOnlyMode: false };
}

async function enrichFeatures(
  tracks: readonly EnrichedTrack[],
  options: LoadOptions,
  report: (progress: LoadProgress) => void,
): Promise<number> {
  report({ phase: "features", done: 0, total: tracks.length });

  const features = await fetchAudioFeatures(
    tracks.map((track) => track.id),
    options.signal,
  );

  for (const track of tracks) {
    track.features = features.get(track.id);
  }

  report({ phase: "features", done: features.size, total: tracks.length });
  return tracks.length === 0 ? 0 : features.size / tracks.length;
}

async function enrichLyrics(
  tracks: readonly EnrichedTrack[],
  sampleSize: number,
  report: (progress: LoadProgress) => void,
): Promise<void> {
  const sample = tracks.slice(0, sampleSize);
  report({ phase: "lyrics", done: 0, total: sample.length });

  const signals = await fetchLyricsSignals(
    sample.map((track) => ({
      trackId: track.id,
      artist: track.artistNames[0] ?? "",
      title: track.name,
    })),
    { maxTracks: sample.length },
  );

  for (const track of tracks) {
    track.lyrics = signals.get(track.id);
  }

  report({ phase: "lyrics", done: signals.size, total: sample.length });
}

export async function loadLibrary(
  client: SpotifyClient,
  options: LoadOptions = {},
): Promise<LibrarySnapshot> {
  const report = options.onProgress ?? (() => undefined);
  const source = options.source ?? { kind: "liked" };

  let totalLiked: number;
  let raw: EnrichedTrack[];

  if (source.kind === "playlist") {
    const firstPage = await client.playlistItemsPage(source.playlistId, 0, PAGE_SIZE);
    totalLiked = firstPage.total;
    const wanted = Math.min(totalLiked, options.maxTracks ?? 3000);
    raw = await fetchPlaylistTracks(
      client,
      source.playlistId,
      wanted,
      report,
      options.signal,
      firstPage,
    );
  } else {
    const firstPage = await client.savedTracksPage(0, PAGE_SIZE);
    totalLiked = firstPage.total;
    const wanted = Math.min(totalLiked, options.maxTracks ?? 3000);
    raw = await fetchLikedTracks(client, wanted, report, options.signal, firstPage);
  }
  const tracks = deduplicate(raw);

  const genres = await enrichGenres(client, tracks, options, report);

  const deep = options.deepAnalysis !== false;
  const featureCoverage = deep ? await enrichFeatures(tracks, options, report) : 0;

  const lyricsSampleSize = options.lyricsSampleSize ?? 0;
  if (deep && lyricsSampleSize > 0) {
    await enrichLyrics(tracks, lyricsSampleSize, report);
  }

  return {
    tracks,
    totalLiked,
    duplicatesRemoved: raw.length - tracks.length,
    genreCoverage: tracks.length === 0 ? 0 : genres.covered / tracks.length,
    nameOnlyMode: genres.nameOnlyMode,
    featureCoverage,
  };
}
