import { generateStructured } from "@/lib/ai/client";
import {
  SCORING_SYSTEM,
  TAXONOMY_SYSTEM,
  buildClassifyPrompt,
  buildClassifySystem,
  buildTaxonomyPrompt,
} from "@/lib/ai/prompts";
import { needsRepairPass, reconcileChunk } from "@/lib/ai/reconcile";
import {
  MISC_SLUG,
  type PlaylistScore,
  PlaylistScoresSchema,
  type Taxonomy,
  TaxonomySchema,
  buildChunkSchema,
} from "@/lib/ai/schemas";
import type { ProviderId } from "@/lib/ai/providers";
import type { EnrichedTrack } from "@/lib/library/track";

export const CHUNK_SIZE = 150;
const CHUNK_CONCURRENCY = 4;
const TAXONOMY_SAMPLE = 120;

export interface OrganizeConfig {
  provider: ProviderId;
  apiKey: string;
  taxonomyModel: string;
  classifyModel: string;
  userPrompt?: string;
  existingPlaylistNames?: readonly string[];
  signal?: AbortSignal;
}

export interface OrganizeUsage {
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export interface PlannedPlaylist {
  slug: string;
  name: string;
  description: string;
  tracks: EnrichedTrack[];
  score?: PlaylistScore;
}

export interface OrganizeQuality {
  hallucinatedIndices: number;
  duplicateAssignments: number;
  unknownCategories: number;
  /* Chunks where the model skipped enough tracks to be worth flagging. */
  chunksNeedingRepair: number;
  unassignedShare: number;
}

export interface OrganizeResult {
  taxonomy: Taxonomy;
  playlists: PlannedPlaylist[];
  unassigned: EnrichedTrack[];
  usage: OrganizeUsage;
  quality: OrganizeQuality;
}

function histogram(values: readonly string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1]);
}

function groupBy(
  tracks: readonly EnrichedTrack[],
  key: (track: EnrichedTrack) => string,
): Map<string, EnrichedTrack[]> {
  const grouped = new Map<string, EnrichedTrack[]>();

  for (const track of tracks) {
    const bucketKey = key(track);
    const bucket = grouped.get(bucketKey);
    if (bucket === undefined) grouped.set(bucketKey, [track]);
    else bucket.push(track);
  }

  return grouped;
}

/*
 * Stratified rather than random: sampling proportionally across genre families
 * stops a dominant family from crowding everything else out of the taxonomy.
 */
function stratifiedSample(tracks: readonly EnrichedTrack[], size: number): EnrichedTrack[] {
  if (tracks.length <= size) return [...tracks];

  const sample: EnrichedTrack[] = [];
  for (const [, bucket] of groupBy(tracks, (track) => track.family)) {
    const quota = Math.max(1, Math.round((bucket.length / tracks.length) * size));
    sample.push(...bucket.slice(0, quota));
  }

  return sample.slice(0, size);
}

export async function proposeTaxonomy(
  tracks: readonly EnrichedTrack[],
  config: OrganizeConfig,
): Promise<{ taxonomy: Taxonomy; usage: OrganizeUsage }> {
  const decades = tracks
    .filter((track) => track.year !== undefined)
    .map((track) => `${Math.floor((track.year ?? 0) / 10) * 10}s`);

  const prompt = buildTaxonomyPrompt({
    totalTracks: tracks.length,
    genreHistogram: histogram(tracks.flatMap((track) => track.genres)),
    decadeHistogram: histogram(decades),
    existingPlaylistNames: config.existingPlaylistNames ?? [],
    sample: stratifiedSample(tracks, TAXONOMY_SAMPLE),
    userPrompt: config.userPrompt,
  });

  const result = await generateStructured({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.taxonomyModel,
    schema: TaxonomySchema,
    system: TAXONOMY_SYSTEM,
    prompt,
    /* Naming deserves some room; classification does not. */
    temperature: 0.7,
    abortSignal: config.signal,
  });

  return {
    taxonomy: result.object,
    usage: {
      inputTokens: result.inputTokens ?? 0,
      outputTokens: result.outputTokens ?? 0,
      calls: 1,
    },
  };
}

interface Chunk {
  family: string;
  tracks: EnrichedTrack[];
}

/*
 * Chunks are built inside a genre family. A coherent chunk steadies the model
 * on borderline calls, and it lets us tell it honestly when a batch has no
 * genre data rather than handing it an empty column to read meaning into.
 */
export function buildChunks(tracks: readonly EnrichedTrack[], size = CHUNK_SIZE): Chunk[] {
  const chunks: Chunk[] = [];

  for (const [family, bucket] of groupBy(tracks, (track) => track.family)) {
    for (let i = 0; i < bucket.length; i += size) {
      chunks.push({ family, tracks: bucket.slice(i, i + size) });
    }
  }

  return chunks;
}

export interface ClassifyProgress {
  done: number;
  total: number;
}

interface ChunkRunner {
  chunks: readonly Chunk[];
  slugs: readonly string[];
  system: string;
  schema: ReturnType<typeof buildChunkSchema>;
  config: OrganizeConfig;
  assigned: Map<string, string>;
  usage: OrganizeUsage;
  quality: OrganizeQuality;
  onProgress?: (progress: ClassifyProgress) => void;
}

async function runChunks(runner: ChunkRunner): Promise<void> {
  let cursor = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    /* eslint-disable no-await-in-loop -- each worker drains chunks in order. */
    for (;;) {
      const chunk = runner.chunks[cursor];
      cursor += 1;
      if (chunk === undefined) return;

      try {
        const result = await generateStructured({
          provider: runner.config.provider,
          apiKey: runner.config.apiKey,
          model: runner.config.classifyModel,
          schema: runner.schema,
          system: runner.system,
          prompt: buildClassifyPrompt(chunk.tracks, chunk.family),
          temperature: 0.2,
          abortSignal: runner.config.signal,
        });

        runner.usage.inputTokens += result.inputTokens ?? 0;
        runner.usage.outputTokens += result.outputTokens ?? 0;
        runner.usage.calls += 1;

        const reconciled = reconcileChunk({
          chunkSize: chunk.tracks.length,
          slugs: runner.slugs,
          buckets: result.object.buckets,
          lowConfidence: result.object.lowConfidence,
        });

        runner.quality.hallucinatedIndices += reconciled.stats.hallucinatedIndices;
        runner.quality.duplicateAssignments += reconciled.stats.duplicateAssignments;
        runner.quality.unknownCategories += reconciled.stats.unknownCategories;

        for (const [localIndex, slug] of reconciled.assignments) {
          const track = chunk.tracks[localIndex];
          if (track !== undefined) runner.assigned.set(track.id, slug);
        }

        if (needsRepairPass(reconciled.stats, chunk.tracks.length)) {
          runner.quality.chunksNeedingRepair += 1;
        }
      } catch {
        /*
         * One bad chunk must never sink the run. These tracks land in
         * "unassigned", where the user can still place them by hand.
         */
        for (const track of chunk.tracks) runner.assigned.set(track.id, MISC_SLUG);
      }

      completed += 1;
      runner.onProgress?.({ done: completed, total: runner.chunks.length });
    }
    /* eslint-enable no-await-in-loop */
  }

  await Promise.all(
    Array.from({ length: Math.min(CHUNK_CONCURRENCY, runner.chunks.length) }, worker),
  );
}

export async function organizeLibrary(
  tracks: readonly EnrichedTrack[],
  config: OrganizeConfig,
  onProgress?: (progress: ClassifyProgress) => void,
): Promise<OrganizeResult> {
  const { taxonomy, usage } = await proposeTaxonomy(tracks, config);

  const slugs = [...taxonomy.playlists.map((item) => item.slug), MISC_SLUG];

  /* Deterministic order in, deterministic chunks out. */
  const ordered = [...tracks].toSorted((a, b) =>
    a.addedAt === b.addedAt ? a.id.localeCompare(b.id) : a.addedAt.localeCompare(b.addedAt),
  );

  const assigned = new Map<string, string>();
  const quality: OrganizeQuality = {
    hallucinatedIndices: 0,
    duplicateAssignments: 0,
    unknownCategories: 0,
    chunksNeedingRepair: 0,
    unassignedShare: 0,
  };

  await runChunks({
    chunks: buildChunks(ordered),
    slugs,
    system: buildClassifySystem(taxonomy),
    schema: buildChunkSchema(slugs),
    config,
    assigned,
    usage,
    quality,
    onProgress,
  });

  const bySlug = groupBy(ordered, (track) => assigned.get(track.id) ?? MISC_SLUG);

  const playlists: PlannedPlaylist[] = taxonomy.playlists
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.vibe.slice(0, 280),
      tracks: bySlug.get(item.slug) ?? [],
    }))
    .filter((playlist) => playlist.tracks.length > 0);

  const unassigned = bySlug.get(MISC_SLUG) ?? [];
  quality.unassignedShare = ordered.length === 0 ? 0 : unassigned.length / ordered.length;

  return { taxonomy, playlists, unassigned, usage, quality };
}

export async function scorePlaylists(
  playlists: readonly PlannedPlaylist[],
  config: OrganizeConfig,
): Promise<PlaylistScore[]> {
  const summary = playlists
    .map((playlist) => {
      const examples = playlist.tracks
        .slice(0, 8)
        .map((track) => `${track.name} — ${track.artistNames[0] ?? "?"}`)
        .join("; ");
      return `${playlist.slug} | ${playlist.name} | ${playlist.tracks.length} utworów | ${examples}`;
    })
    .join("\n");

  const result = await generateStructured({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.taxonomyModel,
    schema: PlaylistScoresSchema,
    system: SCORING_SYSTEM,
    prompt: `Zaproponowane playlisty:\n${summary}`,
    temperature: 0.3,
    abortSignal: config.signal,
  });

  return result.object.scores;
}
