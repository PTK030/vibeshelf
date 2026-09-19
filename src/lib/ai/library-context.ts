import type { SpotifyClient } from "@/lib/spotify/client";

/*
 * A compact profile of the user's Spotify life, assembled from four cheap
 * calls, used as grounding for free-form questions.
 *
 * Kept small on purpose: this is prepended to every question, so every token
 * here is paid for repeatedly. Names and counts, no track-by-track dump.
 */
export async function buildLibraryContext(client: SpotifyClient): Promise<string> {
  const [liked, playlists, topArtists, topTracks] = await Promise.all([
    client.savedTracksPage(0, 20),
    client.playlistsPage(0, 50),
    client.topArtists(20).catch(() => ({ items: [] })),
    client.topTracks(20, "medium_term").catch(() => ({ items: [] })),
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

  const lines = [
    `Polubione utwory: ${liked.total}.`,
    `Playlisty: ${playlists.total}.`,
    topArtists.items.length > 0
      ? `Najczęściej słuchani artyści: ${topArtists.items.map((a) => a.name).join(", ")}.`
      : undefined,
    topGenres.length > 0 ? `Gatunki tych artystów: ${topGenres.join(", ")}.` : undefined,
    topTracks.items.length > 0
      ? `Najczęściej słuchane utwory: ${topTracks.items
          .map((track) => `${track.name} — ${track.artists[0]?.name ?? "?"}`)
          .join("; ")}.`
      : undefined,
    recentLikes.length > 0 ? `Ostatnio polubione: ${recentLikes.join("; ")}.` : undefined,
    playlistNames.length > 0 ? `Nazwy playlist: ${playlistNames.join(", ")}.` : undefined,
  ];

  return lines.filter((line) => line !== undefined).join("\n");
}

export const ASK_SYSTEM = `Odpowiadasz na pytania o bibliotekę muzyczną użytkownika Spotify.

Zasady:
- Odpowiadaj po polsku, zwięźle — kilka zdań, chyba że pytanie wymaga listy.
- Opieraj się na podanych danych. Możesz korzystać z własnej wiedzy o artystach i utworach, żeby je zinterpretować.
- Jeśli danych nie ma (np. pytanie o coś, czego nie widzisz), powiedz to wprost zamiast zgadywać.
- Nie wymyślaj liczb ani tytułów, których nie ma w danych.
- Bez wstępów typu "Oczywiście!" — od razu do rzeczy.`;
