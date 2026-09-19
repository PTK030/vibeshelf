import type { SpotifyClient } from "@/lib/spotify/client";

/*
 * A compact profile of the user's Spotify life, assembled from a handful of
 * cheap calls, used as grounding for free-form questions.
 *
 * Kept small on purpose: this is prepended to every question, so every token
 * here is paid for repeatedly. Names and counts, no track-by-track dump.
 */
export async function buildLibraryContext(client: SpotifyClient): Promise<string> {
  const [liked, playlists, topArtists, topTracks, history] = await Promise.all([
    client.savedTracksPage(0, 20),
    client.playlistsPage(0, 50),
    client.topArtists(20).catch(() => ({ items: [] })),
    client.topTracks(20, "medium_term").catch(() => ({ items: [] })),
    /*
     * Without this the model cannot answer "what did I listen to today", which
     * is the commonest question people ask. Needs user-read-recently-played,
     * so sessions authorised before that scope existed get nothing — and the
     * context says so outright rather than leaving the model to guess.
     */
    client.recentlyPlayed(50).then(
      (result) => result,
      () => undefined,
    ),
  ]);

  const genres = new Map<string, number>();
  for (const artist of topArtists.items) {
    for (const genre of artist.genres ?? []) {
      genres.set(genre, (genres.get(genre) ?? 0) + 1);
    }
  }

  const topGenres = [...genres.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([genre]) => genre);

  const recentLikes = liked.items
    .flatMap((item) => (item.track === null ? [] : [item.track]))
    .map((track) => `${track.name} — ${track.artists.map((a) => a.name).join(", ")}`);

  const playlistNames = playlists.items
    .flatMap((playlist) => (playlist === null ? [] : [playlist.name]))
    .slice(0, 40);

  const now = new Date();

  const lines = [
    `Today is ${now.toLocaleDateString("en-GB", { dateStyle: "full" })}.`,
    `Liked songs: ${liked.total}.`,
    `Playlists: ${playlists.total}.`,
    topArtists.items.length > 0
      ? `Most listened artists: ${topArtists.items.map((a) => a.name).join(", ")}.`
      : undefined,
    topGenres.length > 0 ? `Genres of those artists: ${topGenres.join(", ")}.` : undefined,
    topTracks.items.length > 0
      ? `Most listened tracks: ${topTracks.items
          .map((track) => `${track.name} — ${track.artists[0]?.name ?? "?"}`)
          .join("; ")}.`
      : undefined,
    recentLikes.length > 0 ? `Recently liked: ${recentLikes.join("; ")}.` : undefined,
    playlistNames.length > 0 ? `Playlist names: ${playlistNames.join(", ")}.` : undefined,
    describeHistory(history, now),
  ];

  return lines.filter((line) => line !== undefined).join("\n");
}

type History = Awaited<ReturnType<SpotifyClient["recentlyPlayed"]>> | undefined;

/*
 * Spotify keeps only the last 50 plays, so "today" is whatever part of that
 * window falls on today's date — stated plainly so the model does not present
 * a partial count as a complete one.
 */
function describeHistory(history: History, now: Date): string | undefined {
  if (history === undefined) {
    return "Play history: unavailable (missing the user-read-recently-played scope — the user must sign in again to grant it).";
  }

  const played = history.items.flatMap((item) =>
    item.track === null ? [] : [{ track: item.track, at: new Date(item.played_at) }],
  );

  if (played.length === 0) return "Play history: empty.";

  const todayPlays = played.filter((entry) => entry.at.toDateString() === now.toDateString());

  const counts = new Map<string, number>();
  for (const entry of todayPlays) {
    for (const artist of entry.track.artists) {
      counts.set(artist.name, (counts.get(artist.name) ?? 0) + 1);
    }
  }

  const topToday = [...counts.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, plays]) => `${name} (${plays}x)`);

  const recentTitles = played
    .slice(0, 25)
    .map((entry) => `${entry.track.name} — ${entry.track.artists[0]?.name ?? "?"}`);

  const oldest = played.at(-1)?.at;

  return [
    `Play history (Spotify exposes only the last 50 plays${
      oldest === undefined ? "" : `, oldest from ${oldest.toLocaleString("en-GB")}`
    }):`,
    todayPlays.length === 0
      ? "Today: no plays inside that window."
      : `Today: ${todayPlays.length} plays. Most frequent: ${topToday.join(", ")}.`,
    `Most recent plays in order: ${recentTitles.join("; ")}.`,
  ].join("\n");
}

export const ASK_SYSTEM = `You answer questions about a Spotify user's music library.

Rules:
- Answer in English, concisely — a few sentences, unless the question calls for a list.
- Work from the data provided. You may use your own knowledge of artists and tracks to interpret it.
- If the data is not there, say so plainly instead of guessing.
- Never invent numbers or titles that are not in the data.
- Play history covers only the last 50 plays — if you use it, say so rather than presenting the figures as complete.
- No preamble like "Certainly!" — answer directly.`;
