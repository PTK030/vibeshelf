import { z } from "zod";

/*
 * The plan is the contract between the streaming analysis and the browser.
 * With no database it lives in React state until the user approves it, so it
 * is re-validated on the way back in before anything is written to Spotify.
 */
export const PlanTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artistNames: z.array(z.string()),
  albumName: z.string(),
  durationMs: z.number(),
  imageUrl: z.string().optional(),
  spotifyUrl: z.string(),
  tempo: z.number().optional(),
});

export type PlanTrack = z.infer<typeof PlanTrackSchema>;

export const PlanPlaylistSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  score: z
    .object({
      score: z.number(),
      reason: z.string(),
      strengths: z.array(z.string()),
      risks: z.array(z.string()),
    })
    .optional(),
  tracks: z.array(PlanTrackSchema),
});

export type PlanPlaylist = z.infer<typeof PlanPlaylistSchema>;

export const PlanSchema = z.object({
  playlists: z.array(PlanPlaylistSchema),
  unassigned: z.number(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    calls: z.number(),
  }),
  quality: z.object({
    hallucinatedIndices: z.number(),
    duplicateAssignments: z.number(),
    unknownCategories: z.number(),
    chunksNeedingRepair: z.number(),
    unassignedShare: z.number(),
  }),
});

export type Plan = z.infer<typeof PlanSchema>;

export const LibraryStatsSchema = z.object({
  tracks: z.number(),
  totalLiked: z.number(),
  duplicatesRemoved: z.number(),
  genreCoverage: z.number(),
  featureCoverage: z.number(),
  nameOnlyMode: z.boolean(),
});

export type LibraryStats = z.infer<typeof LibraryStatsSchema>;
