import { z } from "zod";

/*
 * Spotify removed audio-features for new apps in November 2024, so tempo,
 * energy and valence are simply not available from them any more. ReccoBeats
 * exposes the same nine dimensions, free and without an API key, and it still
 * accepts batches — which Spotify no longer does.
 *
 * Coverage is partial (~75% on a mixed sample). A miss is normal, not an
 * error: the model falls back on what it knows about the track.
 */
const API = "https://api.reccobeats.com/v1/audio-features";

/* Verified working at 20; the documented ceiling is higher. */
const BATCH_SIZE = 40;

const FeatureSchema = z.object({
  href: z.string().optional(),
  isrc: z.string().nullable().optional(),
  tempo: z.number().nullable().optional(),
  energy: z.number().nullable().optional(),
  valence: z.number().nullable().optional(),
  danceability: z.number().nullable().optional(),
  acousticness: z.number().nullable().optional(),
  instrumentalness: z.number().nullable().optional(),
  speechiness: z.number().nullable().optional(),
  liveness: z.number().nullable().optional(),
  loudness: z.number().nullable().optional(),
});

const ResponseSchema = z.object({ content: z.array(FeatureSchema) });

export interface AudioFeatures {
  /* BPM. */
  tempo: number | undefined;
  energy: number | undefined;
  valence: number | undefined;
  danceability: number | undefined;
  acousticness: number | undefined;
  instrumentalness: number | undefined;
  speechiness: number | undefined;
}

/* The Spotify id is only present inside the href they echo back. */
function spotifyIdFromHref(href: string | undefined): string | undefined {
  if (href === undefined) return undefined;
  const match = /\/track\/([A-Za-z0-9]{22})/.exec(href);
  return match?.[1];
}

function value(input: number | null | undefined): number | undefined {
  return input ?? undefined;
}

function toFeatures(raw: z.infer<typeof FeatureSchema>): AudioFeatures {
  return {
    tempo: value(raw.tempo),
    energy: value(raw.energy),
    valence: value(raw.valence),
    danceability: value(raw.danceability),
    acousticness: value(raw.acousticness),
    instrumentalness: value(raw.instrumentalness),
    speechiness: value(raw.speechiness),
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/*
 * Returns a map keyed by Spotify track id. Tracks with no data are simply
 * absent; a failing batch is skipped rather than failing the whole run,
 * because this is an enhancement, not a dependency.
 */
export async function fetchAudioFeatures(
  trackIds: readonly string[],
  signal?: AbortSignal,
): Promise<Map<string, AudioFeatures>> {
  const found = new Map<string, AudioFeatures>();
  const batches = chunk([...new Set(trackIds)], BATCH_SIZE);

  /* eslint-disable no-await-in-loop -- sequential on purpose: an undocumented
     free API should not be hit with a burst of parallel requests. */
  for (const batch of batches) {
    try {
      const response = await fetch(`${API}?ids=${batch.join(",")}`, {
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok) continue;

      const parsed = ResponseSchema.safeParse(await response.json());
      if (!parsed.success) continue;

      for (const entry of parsed.data.content) {
        const id = spotifyIdFromHref(entry.href);
        if (id !== undefined) found.set(id, toFeatures(entry));
      }
    } catch {
      /* Network hiccup or abort — keep whatever we already have. */
    }
  }
  /* eslint-enable no-await-in-loop */

  return found;
}
