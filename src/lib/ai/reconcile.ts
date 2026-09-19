import { MISC_SLUG } from "@/lib/ai/schemas";

/*
 * The model works on indices local to a chunk and never sees a Spotify id, so
 * a hallucinated *track* is structurally impossible. What it can still do is
 * invent an index, skip tracks, assign one track twice, or ignore the enum and
 * return a category that does not exist. All four are handled here.
 *
 * The guiding rule: one bad chunk must never fail the run. 150 tracks landing
 * in "unassigned" is a far better outcome than losing the whole analysis.
 */

export interface RawBucket {
  category: string;
  tracks: number[];
}

export interface ReconcileInput {
  chunkSize: number;
  /* Taxonomy slugs in priority order — earlier wins a tie. */
  slugs: readonly string[];
  buckets: readonly RawBucket[];
  lowConfidence?: readonly number[];
}

export interface ReconcileStats {
  hallucinatedIndices: number;
  duplicateAssignments: number;
  unknownCategories: number;
  repairedCategories: number;
  missing: number;
}

export interface ReconcileResult {
  /* index -> slug, complete for every index in the chunk. */
  assignments: Map<number, string>;
  lowConfidence: Set<number>;
  stats: ReconcileStats;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const temp = previous[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      previous[j] = Math.min((previous[j] ?? 0) + 1, (previous[j - 1] ?? 0) + 1, diagonal + cost);
      diagonal = temp;
    }
  }

  return previous[b.length] ?? 0;
}

/*
 * Only used when a provider ignored the enum. A close miss ("bieganie" for
 * "bieganie_") is repaired; anything further is dropped so the track falls
 * through to _misc rather than landing somewhere arbitrary.
 */
function repairSlug(candidate: string, slugs: readonly string[]): string | undefined {
  const normalised = candidate.trim().toLowerCase();
  if (slugs.includes(normalised)) return normalised;

  let best: { slug: string; distance: number } | undefined;
  for (const slug of slugs) {
    const distance = levenshtein(normalised, slug) / Math.max(normalised.length, slug.length);
    if (distance <= 0.2 && (best === undefined || distance < best.distance)) {
      best = { slug, distance };
    }
  }

  return best?.slug;
}

export function reconcileChunk(input: ReconcileInput): ReconcileResult {
  const { chunkSize, slugs, buckets } = input;
  const priority = new Map(slugs.map((slug, index) => [slug, index]));

  const assignments = new Map<number, string>();
  const stats: ReconcileStats = {
    hallucinatedIndices: 0,
    duplicateAssignments: 0,
    unknownCategories: 0,
    repairedCategories: 0,
    missing: 0,
  };

  for (const bucket of buckets) {
    const resolved = repairSlug(bucket.category, slugs);

    if (resolved === undefined) {
      stats.unknownCategories += 1;
      continue;
    }
    if (resolved !== bucket.category) stats.repairedCategories += 1;

    for (const index of bucket.tracks) {
      if (!Number.isInteger(index) || index < 0 || index >= chunkSize) {
        stats.hallucinatedIndices += 1;
        continue;
      }

      const existing = assignments.get(index);
      if (existing === undefined) {
        assignments.set(index, resolved);
        continue;
      }

      stats.duplicateAssignments += 1;
      /* Deterministic tie-break: the earlier taxonomy entry keeps the track. */
      const existingRank = priority.get(existing) ?? Number.MAX_SAFE_INTEGER;
      const candidateRank = priority.get(resolved) ?? Number.MAX_SAFE_INTEGER;
      if (candidateRank < existingRank) assignments.set(index, resolved);
    }
  }

  for (let index = 0; index < chunkSize; index += 1) {
    if (!assignments.has(index)) {
      assignments.set(index, MISC_SLUG);
      stats.missing += 1;
    }
  }

  const lowConfidence = new Set(
    (input.lowConfidence ?? []).filter(
      (index) => Number.isInteger(index) && index >= 0 && index < chunkSize,
    ),
  );

  return { assignments, lowConfidence, stats };
}

/* Above this, the chunk is worth one repair pass with only the missing tracks. */
export const MISSING_RETRY_THRESHOLD = 0.1;

export function needsRepairPass(stats: ReconcileStats, chunkSize: number): boolean {
  if (chunkSize === 0) return false;
  return stats.missing / chunkSize > MISSING_RETRY_THRESHOLD;
}
