import type { SpotifyClient } from "@/lib/spotify/client";

/*
 * A compact profile of the user's Spotify life, used as grounding for
 * free-form questions.
 *
 * Every entity is listed with its Spotify id, because the model answers with
 * ids and the server turns those into links. Asking a model for a URL directly
 * gets a plausible invented one.
 *
 * Kept small on purpose: this is prepended to every question, so each token is
 * paid for repeatedly.
 */
export interface LibraryContext {
  text: string;
  /* Ids the model is allowed to reference, so hallucinated ones can be dropped. */
  knownIds: Set<string>;
  /* playlist id -> name, for resolving an action back to something readable. */
  playlists: Map<string, string>;
}

export async function buildLibraryContext(client: SpotifyClient): Promise<LibraryContext> {
  const [liked, playlists, topArtists, topTracks, history] = await Promise.all([
    client.savedTracksPage(0, 20),
    client.playlistsPage(0, 50),
    client.topArtists(20).catch(() => ({ items: [] })),
    client.topTracks(20, "medium_term").catch(() => ({ items: [] })),
    /*
     * Needed to answer "what did I listen to today", the commonest question.
     * Sessions authorised before user-read-recently-played existed get
     * nothing, and the context says so rather than leaving the model to guess.
     */
    client.recentlyPlayed(50).then(
      (result) => result,
      () => undefined,
    ),
  ]);

  const knownIds = new Set<string>();
  const playlistNames = new Map<string, string>();

  const genres = new Map<string, number>();
  for (const artist of topArtists.items) {
    knownIds.add(artist.id);
    for (const genre of artist.genres ?? []) {
      genres.set(genre, (genres.get(genre) ?? 0) + 1);
    }
  }

  const topGenres = [...genres.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([genre]) => genre);

  const artistLines = topArtists.items.map((artist) => `${artist.name} [${artist.id}]`);

  const trackLines = topTracks.items.flatMap((track) => {
    if (track.id === null) return [];
    knownIds.add(track.id);
    return [`${track.name} — ${track.artists[0]?.name ?? "?"} [${track.id}]`];
  });

  const likedLines = liked.items.flatMap((item) => {
    const track = item.track;
    if (track === null || track.id === null) return [];
    knownIds.add(track.id);
    return [`${track.name} — ${track.artists.map((a) => a.name).join(", ")} [${track.id}]`];
  });

  const playlistLines = playlists.items.flatMap((playlist) => {
    if (playlist === null) return [];
    knownIds.add(playlist.id);
    playlistNames.set(playlist.id, playlist.name);
    return [`${playlist.name} [${playlist.id}]`];
  });

  const now = new Date();

  const lines = [
    `Today is ${now.toLocaleDateString("en-GB", { dateStyle: "full" })}.`,
    "Entities are listed as: Name [spotify_id]. Use those ids when referencing something.",
    `Liked songs: ${liked.total}. Playlists: ${playlists.total}.`,
    artistLines.length > 0 ? `Most listened artists: ${artistLines.join("; ")}.` : undefined,
    topGenres.length > 0 ? `Genres of those artists: ${topGenres.join(", ")}.` : undefined,
    trackLines.length > 0 ? `Most listened tracks: ${trackLines.join("; ")}.` : undefined,
    likedLines.length > 0 ? `Recently liked: ${likedLines.join("; ")}.` : undefined,
    playlistLines.length > 0 ? `Playlists: ${playlistLines.slice(0, 40).join("; ")}.` : undefined,
    describeHistory(history, now),
  ];

  return {
    text: lines.filter((line) => line !== undefined).join("\n"),
    knownIds,
    playlists: playlistNames,
  };
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

  const recentTitles = played.slice(0, 25).map((entry) => {
    const id = entry.track.id;
    const title = `${entry.track.name} — ${entry.track.artists[0]?.name ?? "?"}`;
    return id === null ? title : `${title} [${id}]`;
  });

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

export const ASK_SYSTEM = `You answer questions about a Spotify user's music library, and you can offer an action.

Answer:
- English, concise — a few sentences, unless the question calls for a list.
- Work from the data provided; use your own knowledge of artists and tracks to interpret it.
- If the data is not there, say so plainly instead of guessing.
- Never invent numbers or titles that are not in the data.
- Play history covers only the last 50 plays — if you use it, say so.
- No preamble like "Certainly!".
- Do not paste ids or links into the answer text; put them in references instead.

References:
- List the tracks, artists or playlists you actually named, using the id shown in [brackets].
- Only ids that appear in the data. Never invent one.
- At most eight, and only for things worth clicking.

Action — include one ONLY when the user is asking for something to be done, not merely described:
- "sort/organise/clean up my library" → kind "organize-library", with a prompt describing what they asked for.
- "sort playlist X" → kind "organize-playlist", playlistId set to that playlist's id from the data, prompt describing the goal.
- A question that only asks about the library gets no action.`;
