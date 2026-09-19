import { z } from "zod";

/*
 * The answer is structured rather than free text so it can be acted on.
 *
 * References carry Spotify ids, never URLs: the ids come from the context we
 * supplied, and the server turns them into links. A model asked for a URL will
 * happily invent a plausible one.
 */
export const ReferenceSchema = z.object({
  kind: z.enum(["track", "artist", "playlist"]),
  /* Must be one of the ids given in the context. Unknown ids are dropped. */
  id: z.string(),
  label: z.string().max(80),
});

export type Reference = z.infer<typeof ReferenceSchema>;

/*
 * An action turns "sort my running playlist" into a button instead of a
 * suggestion the user has to carry out by hand.
 */
export const ActionSchema = z.object({
  kind: z.enum(["organize-library", "organize-playlist"]),
  /* The brief handed to the analysis. */
  prompt: z.string().max(300),
  /* Button text, e.g. "Sort Gym Hits". */
  label: z.string().max(60),
  /* Required for organize-playlist; must be an id from the context. */
  playlistId: z.string().optional(),
});

export type AskAction = z.infer<typeof ActionSchema>;

export const AskAnswerSchema = z.object({
  answer: z.string(),
  references: z.array(ReferenceSchema).max(8).default([]),
  /* Omitted unless the question actually implies doing something. */
  action: ActionSchema.optional(),
});

export type AskAnswer = z.infer<typeof AskAnswerSchema>;

/* What the client renders: ids already resolved to links. */
export interface ResolvedReference {
  kind: Reference["kind"];
  label: string;
  url: string;
}
