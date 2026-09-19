import { z } from "zod";

/*
 * Phase A: the model proposes the taxonomy once, from a sample. Freezing it
 * before classification is what makes the per-chunk results mergeable — the
 * alternative (each chunk inventing its own names) turns merging into fuzzy
 * matching of "Do biegania" against "Bieganie / szybkie".
 */
export const TaxonomyItemSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]{1,15}$/, "slug must be lowercase, 2-16 chars, no spaces"),
  /* Shown to the user, so Polish. */
  name: z.string().min(3).max(40),
  /* The criterion phase B classifies against. */
  vibe: z.string().min(20).max(200),
  keepIf: z.array(z.string().max(40)).max(5),
  avoidIf: z.array(z.string().max(40)).max(5),
  estimatedShare: z.number().min(0.02).max(0.5),
});

export type TaxonomyItem = z.infer<typeof TaxonomyItemSchema>;

export const TaxonomySchema = z.object({
  playlists: z.array(TaxonomyItemSchema).min(4).max(14),
  note: z.string().max(300),
});

export type Taxonomy = z.infer<typeof TaxonomySchema>;

/* Added server-side, never proposed by the model, and never created on Spotify. */
export const MISC_SLUG = "_misc";

/*
 * Phase B output, grouped by category.
 *
 * Grouping costs ~2.8 tokens per track versus ~14 for one object per track,
 * while staying verifiable. A bare positional array would be cheaper still,
 * but if the model loses count halfway the array is *still the right length*
 * with every later assignment shifted by one — an error no validation can
 * see. Strict mode also ignores minItems/maxItems, so that "guarantee" is not
 * real. Detectability wins.
 */
export function buildChunkSchema(slugs: readonly string[]) {
  const slugEnum = z.enum(slugs as [string, ...string[]]);

  return z.object({
    buckets: z.array(
      z.object({
        category: slugEnum,
        /* Indices local to this chunk — the model never sees a Spotify id. */
        tracks: z.array(z.number().int().nonnegative()),
      }),
    ),
    /* Indices the model was unsure about; they are steered toward _misc. */
    lowConfidence: z.array(z.number().int().nonnegative()),
  });
}

export type ChunkAssignment = z.infer<ReturnType<typeof buildChunkSchema>>;

/* Phase C: how well each proposed playlist matches the listening profile. */
export const PlaylistScoreSchema = z.object({
  slug: z.string(),
  /* 0-100, deliberately coarse — precision here would be false. */
  score: z.number().int().min(0).max(100),
  /* One sentence, Polish, shown next to the score. */
  reason: z.string().min(10).max(200),
  strengths: z.array(z.string().max(60)).max(3),
  risks: z.array(z.string().max(60)).max(3),
});

export const PlaylistScoresSchema = z.object({
  scores: z.array(PlaylistScoreSchema),
});

export type PlaylistScore = z.infer<typeof PlaylistScoreSchema>;
