import { SpotifyClient, SpotifyRequestError } from "@/lib/spotify/client";

export interface PlayedPlaylist {
  id: string;
  name: string;
  owner: string | undefined;
  imageUrl: string | undefined;
  trackCount: number | undefined;
  spotifyUrl: string;
  /* How many of the last 50 plays came from this playlist. */
  plays: number;
}

const PLAYLIST_URI = /^spotify:playlist:([A-Za-z0-9]+)$/;

function playlistUrl(id: string): string {
  return `https://open.spotify.com/playlist/${id}`;
}

type History = Awaited<ReturnType<SpotifyClient["recentlyPlayed"]>>;
type OwnedPlaylists = Map<
  string,
  { name: string; url: string; imageUrl: string | undefined; trackCount: number | undefined }
>;

function countPlaylistPlays(history: History): Map<string, number> {
  const plays = new Map<string, number>();

  for (const item of history.items) {
    const uri = item.context?.uri;
    if (uri === undefined || uri === null) continue;

    const id = PLAYLIST_URI.exec(uri)?.[1];
    if (id === undefined) continue;

    plays.set(id, (plays.get(id) ?? 0) + 1);
  }

  return plays;
}

/*
 * One request for up to 50 of the user's own playlists, rather than one per
 * playlist. Only something played from somebody else's playlist needs a
 * separate lookup, which is rare.
 */
async function loadOwnedPlaylists(client: SpotifyClient): Promise<OwnedPlaylists> {
  const owned: OwnedPlaylists = new Map();

  try {
    const page = await client.playlistsPage(0, 50);
    for (const playlist of page.items) {
      if (playlist === null) continue;
      owned.set(playlist.id, {
        name: playlist.name,
        url: playlist.external_urls?.spotify ?? playlistUrl(playlist.id),
        imageUrl: playlist.images?.[0]?.url,
        trackCount: playlist.tracks?.total,
      });
    }
  } catch {
    /* Fall through to individual lookups. */
  }

  return owned;
}

async function resolvePlaylist(
  client: SpotifyClient,
  id: string,
  plays: number,
  owned: OwnedPlaylists,
): Promise<PlayedPlaylist | undefined> {
  const known = owned.get(id);
  if (known !== undefined) {
    return {
      id,
      name: known.name,
      owner: undefined,
      imageUrl: known.imageUrl,
      trackCount: known.trackCount,
      spotifyUrl: known.url,
      plays,
    };
  }

  try {
    const playlist = await client.playlist(id);
    return {
      id,
      name: playlist.name,
      owner: playlist.owner?.display_name ?? undefined,
      imageUrl: playlist.images?.[0]?.url,
      trackCount: playlist.tracks?.total,
      spotifyUrl: playlist.external_urls?.spotify ?? playlistUrl(id),
      plays,
    };
  } catch {
    /* Deleted or private — skip rather than render a blank row. */
    return undefined;
  }
}

/*
 * Three outcomes, not two. Silently hiding the section when the scope is
 * missing leaves the user staring at an absence with no explanation — which is
 * exactly what happened after the scope was introduced, since sessions issued
 * before it keep working for everything else.
 */
export type PlayedPlaylistsResult =
  | { status: "ok"; playlists: PlayedPlaylist[] }
  | { status: "empty" }
  | { status: "needs-reauth" };

/*
 * Spotify publishes no "most played playlists" statistic — /me/top covers
 * artists and tracks only. The closest honest answer is the play history: each
 * entry carries the context it was played from, so counting playlist contexts
 * across the last 50 plays gives a real, if short, ranking.
 *
 * Needs the user-read-recently-played scope. Sessions authorised before that
 * scope existed get a 403, so callers must treat an empty result as normal.
 */
export async function recentlyPlayedPlaylists(
  client: SpotifyClient,
  limit = 4,
): Promise<PlayedPlaylistsResult> {
  let history: History;
  try {
    history = await client.recentlyPlayed(50);
  } catch (error) {
    /* 403 means the session predates the user-read-recently-played scope. */
    if (error instanceof SpotifyRequestError && error.status === 403) {
      return { status: "needs-reauth" };
    }
    return { status: "empty" };
  }

  const plays = countPlaylistPlays(history);

  const ranked = [...plays.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, limit);
  if (ranked.length === 0) return { status: "empty" };

  const owned = await loadOwnedPlaylists(client);

  const resolved = await Promise.all(
    ranked.map(([id, count]) => resolvePlaylist(client, id, count, owned)),
  );

  const playlists = resolved.filter(
    (playlist): playlist is PlayedPlaylist => playlist !== undefined,
  );

  return playlists.length === 0 ? { status: "empty" } : { status: "ok", playlists };
}
