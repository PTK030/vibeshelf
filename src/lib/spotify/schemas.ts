import { z } from "zod";

/*
 * Only the fields we actually use. Spotify's February 2026 change stripped
 * email/country/product from the user object, so they are absent by design.
 */
const ImageSchema = z.object({
  url: z.string(),
  height: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
});

export const CurrentUserSchema = z.object({
  id: z.string(),
  /* Newer, stable, pseudonymous id. Not present on every response yet. */
  account_id: z.string().optional(),
  display_name: z.string().nullable().optional(),
  images: z.array(ImageSchema).optional(),
  external_urls: z.object({ spotify: z.string() }).optional(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

const SimplifiedArtistSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
});

const AlbumSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  release_date: z.string().nullable().optional(),
  images: z.array(ImageSchema).optional(),
});

export const TrackSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  artists: z.array(SimplifiedArtistSchema),
  album: AlbumSchema,
  duration_ms: z.number(),
  explicit: z.boolean().optional(),
  external_ids: z.object({ isrc: z.string().optional() }).optional(),
  external_urls: z.object({ spotify: z.string() }).optional(),
});

export type SpotifyTrack = z.infer<typeof TrackSchema>;

export const SavedTracksPageSchema = z.object({
  items: z.array(
    z.object({
      added_at: z.string(),
      /* Local files and unavailable items come back as null. */
      track: TrackSchema.nullable(),
    }),
  ),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  next: z.string().nullable(),
});

export const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  /* Deprecated upstream; may be absent or empty. Never depend on it. */
  genres: z.array(z.string()).optional(),
});

export const PlaylistPageSchema = z.object({
  items: z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        public: z.boolean().nullable().optional(),
        snapshot_id: z.string().optional(),
        owner: z.object({ id: z.string() }).optional(),
        external_urls: z.object({ spotify: z.string() }).optional(),
      })
      .nullable(),
  ),
  total: z.number(),
  next: z.string().nullable(),
});

export const CreatedPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  external_urls: z.object({ spotify: z.string() }).optional(),
});

export const TopArtistsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      genres: z.array(z.string()).optional(),
      images: z.array(ImageSchema).optional(),
      external_urls: z.object({ spotify: z.string() }).optional(),
    }),
  ),
});

export const TopTracksSchema = z.object({
  items: z.array(TrackSchema),
});

export const RecentlyPlayedSchema = z.object({
  items: z.array(
    z.object({
      played_at: z.string(),
      track: TrackSchema.nullable(),
      /* Absent when the track was played outside any collection. */
      context: z
        .object({
          type: z.string(),
          uri: z.string(),
          external_urls: z.object({ spotify: z.string() }).optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});

export const PlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(ImageSchema).nullable().optional(),
  owner: z.object({ display_name: z.string().nullable().optional() }).optional(),
  external_urls: z.object({ spotify: z.string() }).optional(),
});
