import { describe, expect, it } from "vitest";
import { recentlyPlayedPlaylists } from "@/features/library/recent-playlists";
import { SpotifyRequestError, type SpotifyClient } from "@/lib/spotify/client";

function playedFrom(playlistId: string | undefined) {
  return {
    played_at: new Date().toISOString(),
    track: {
      id: "t1",
      name: "Track",
      artists: [{ id: "a1", name: "Artist" }],
      album: { id: "al1", name: "Album" },
      duration_ms: 200_000,
    },
    context:
      playlistId === undefined ? null : { type: "playlist", uri: `spotify:playlist:${playlistId}` },
  };
}

function fakeClient(overrides: Partial<SpotifyClient>): SpotifyClient {
  return {
    recentlyPlayed: async () => ({ items: [] }),
    playlistsPage: async () => ({ items: [], total: 0, next: null }),
    playlist: async () => {
      throw new SpotifyRequestError(404, "missing");
    },
    ...overrides,
  } as unknown as SpotifyClient;
}

describe("recentlyPlayedPlaylists", () => {
  it("reports needs-reauth on 403 rather than pretending there is no data", async () => {
    /* The regression this guards: a session predating the scope silently
       rendered an empty section with no explanation. */
    const client = fakeClient({
      recentlyPlayed: async () => {
        throw new SpotifyRequestError(403, "forbidden");
      },
    });

    expect(await recentlyPlayedPlaylists(client)).toEqual({ status: "needs-reauth" });
  });

  it("reports empty when history holds no playlist contexts", async () => {
    const client = fakeClient({
      recentlyPlayed: async () => ({ items: [playedFrom(undefined), playedFrom(undefined)] }),
    });

    expect(await recentlyPlayedPlaylists(client)).toMatchObject({ status: "empty", sampled: 2 });
  });

  it("reports what the plays did start from, so an empty section is explainable", async () => {
    const client = fakeClient({
      recentlyPlayed: async () => ({ items: [playedFrom(undefined), playedFrom(undefined)] }),
    });

    const result = await recentlyPlayedPlaylists(client);

    expect(result.status).toBe("empty");
    if (result.status !== "empty") return;
    expect(result.breakdown).toEqual([["none", 2]]);
  });

  it("ranks playlists by how often they were played", async () => {
    const client = fakeClient({
      recentlyPlayed: async () => ({
        items: [playedFrom("aaa"), playedFrom("bbb"), playedFrom("aaa"), playedFrom("aaa")],
      }),
      playlistsPage: async () => ({
        items: [
          { id: "aaa", name: "Morning", external_urls: { spotify: "u/aaa" } },
          { id: "bbb", name: "Gym", external_urls: { spotify: "u/bbb" } },
        ],
        total: 2,
        next: null,
      }),
    });

    const result = await recentlyPlayedPlaylists(client);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.playlists.map((p) => [p.name, p.plays])).toEqual([
      ["Morning", 3],
      ["Gym", 1],
    ]);
  });

  it("treats other failures as empty rather than throwing", async () => {
    const client = fakeClient({
      recentlyPlayed: async () => {
        throw new SpotifyRequestError(500, "server error");
      },
    });

    expect(await recentlyPlayedPlaylists(client)).toMatchObject({ status: "empty" });
  });

  it("accepts the legacy spotify:user:<id>:playlist:<id> form", async () => {
    const client = fakeClient({
      recentlyPlayed: async () => ({
        items: [
          {
            played_at: new Date().toISOString(),
            track: {
              id: "t1",
              name: "Track",
              artists: [{ id: "a1", name: "Artist" }],
              album: { id: "al1", name: "Album" },
              duration_ms: 200_000,
            },
            context: { type: "playlist", uri: "spotify:user:someone:playlist:legacy1" },
          },
        ],
      }),
      playlistsPage: async () => ({
        items: [{ id: "legacy1", name: "Old one", external_urls: { spotify: "u/legacy1" } }],
        total: 1,
        next: null,
      }),
    });

    const result = await recentlyPlayedPlaylists(client);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.playlists[0]?.name).toBe("Old one");
  });
});
