import { z } from "zod";
import {
  RateLimitedError,
  SpotifyLimiter,
  isUnreasonableRetryAfter,
  parseRetryAfter,
} from "@/lib/spotify/limiter";
import {
  ArtistSchema,
  CreatedPlaylistSchema,
  CurrentUserSchema,
  PlaylistPageSchema,
  SavedTracksPageSchema,
} from "@/lib/spotify/schemas";

const API_BASE = "https://api.spotify.com/v1";

const SnapshotSchema = z.object({ snapshot_id: z.string().optional() });

export class SpotifyTokenExpiredError extends Error {
  constructor() {
    super("Spotify access token expired.");
    this.name = "SpotifyTokenExpiredError";
  }
}

export class SpotifyRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SpotifyRequestError";
    this.status = status;
  }
}

export class SpotifyClient {
  private readonly accessToken: string;
  private readonly limiter: SpotifyLimiter;

  constructor(accessToken: string, limiter = new SpotifyLimiter()) {
    this.accessToken = accessToken;
    this.limiter = limiter;
  }

  private async raw(path: string, init?: RequestInit): Promise<Response> {
    return await this.limiter.run(async () =>
      fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
      }),
    );
  }

  /*
   * Retries only on 429 and 5xx; 401 and 4xx surface immediately. The awaits
   * are sequential by design — that is what a backoff is.
   */
  /* eslint-disable no-await-in-loop */
  async request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const maxAttempts = 4;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await this.raw(path, init);

      if (response.status === 401) throw new SpotifyTokenExpiredError();

      if (response.status === 429) {
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        if (isUnreasonableRetryAfter(retryAfter)) throw new RateLimitedError(retryAfter);
        this.limiter.noteRateLimited(retryAfter);
        continue;
      }

      if (response.status >= 500 && attempt < maxAttempts) {
        const backoffMs = 2 ** (attempt - 1) * 500 * (0.75 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (!response.ok) {
        throw new SpotifyRequestError(response.status, `${path} → ${response.status}`);
      }

      if (response.status === 204) return schema.parse(undefined);
      return schema.parse(await response.json());
    }

    throw new SpotifyRequestError(429, `${path} → gave up after ${maxAttempts} attempts`);
  }
  /* eslint-enable no-await-in-loop */

  async currentUser() {
    return await this.request("/me", CurrentUserSchema);
  }

  /* Liked Songs. Max 50 per page, and the response carries `total`. */
  async savedTracksPage(offset: number, limit = 50) {
    return await this.request(`/me/tracks?limit=${limit}&offset=${offset}`, SavedTracksPageSchema);
  }

  async playlistsPage(offset: number, limit = 50) {
    return await this.request(`/me/playlists?limit=${limit}&offset=${offset}`, PlaylistPageSchema);
  }

  /* One request per artist — the batch endpoint was removed in February 2026. */
  async artist(artistId: string) {
    return await this.request(`/artists/${artistId}`, ArtistSchema);
  }

  /* POST /me/playlists — the old /users/{id}/playlists route no longer exists. */
  async createPlaylist(input: { name: string; description: string; isPublic: boolean }) {
    return await this.request("/me/playlists", CreatedPlaylistSchema, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        public: input.isPublic,
      }),
    });
  }

  /*
   * Max 100 URIs per call, sent in the body: a long list as a query parameter
   * would exceed the URL length limit. Call this sequentially — parallel
   * batches would scramble the track order.
   */
  async addPlaylistItems(playlistId: string, uris: readonly string[]) {
    return await this.request(`/playlists/${playlistId}/items`, SnapshotSchema, {
      method: "POST",
      body: JSON.stringify({ uris }),
    });
  }
}
