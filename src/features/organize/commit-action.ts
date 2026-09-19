"use server";

import { z } from "zod";
import { requireSessionForApi } from "@/lib/auth/api-session";
import { SpotifyClient } from "@/lib/spotify/client";

/* Spotify accepts at most 100 URIs per call. */
const BATCH_SIZE = 100;

const CommitSchema = z.object({
  playlists: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(280),
        isPublic: z.boolean(),
        trackIds: z.array(z.string()).min(1),
      }),
    )
    .min(1)
    .max(20),
});

export interface CommitResult {
  ok: boolean;
  created: Array<{ name: string; url: string | undefined; trackCount: number }>;
  message: string;
}

/*
 * The only place in the app that writes to Spotify.
 *
 * Creating a playlist is not idempotent upstream — a retry after a timeout
 * makes a duplicate — so each playlist is created once and its batches are
 * added sequentially. Parallel batches would also scramble track order.
 */
export async function commitPlan(input: unknown): Promise<CommitResult> {
  const parsed = CommitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, created: [], message: "Plan jest nieprawidłowy." };
  }

  const session = await requireSessionForApi();
  if (session === undefined) {
    return { ok: false, created: [], message: "Sesja wygasła. Zaloguj się ponownie." };
  }

  const client = new SpotifyClient(session.accessToken);
  const created: CommitResult["created"] = [];

  try {
    /* eslint-disable no-await-in-loop -- writes stay sequential to keep order. */
    for (const playlist of parsed.data.playlists) {
      const spotifyPlaylist = await client.createPlaylist({
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.isPublic,
      });

      for (let i = 0; i < playlist.trackIds.length; i += BATCH_SIZE) {
        const uris = playlist.trackIds.slice(i, i + BATCH_SIZE).map((id) => `spotify:track:${id}`);
        await client.addPlaylistItems(spotifyPlaylist.id, uris);
      }

      created.push({
        name: playlist.name,
        url: spotifyPlaylist.external_urls?.spotify,
        trackCount: playlist.trackIds.length,
      });
    }
    /* eslint-enable no-await-in-loop */

    return {
      ok: true,
      created,
      message: `Utworzono ${created.length} playlist na Twoim koncie.`,
    };
  } catch (error) {
    /* Report what did land, so the user is not left guessing. */
    return {
      ok: false,
      created,
      message:
        created.length === 0
          ? "Nie udało się utworzyć playlist."
          : `Utworzono ${created.length} z ${parsed.data.playlists.length} playlist, potem wystąpił błąd: ${
              error instanceof Error ? error.message : "nieznany"
            }`,
    };
  }
}
