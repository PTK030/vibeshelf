# Architecture

## There is no database

State that must survive a request lives in one encrypted cookie (`jose` JWE,
A256GCM): the Spotify tokens, the user's OpenRouter key, and who they are.
Everything else is derived on demand.

The trade this makes:

- **Gained** — one Vercel project, no external service, no migrations, nothing
  of the user's stored anywhere we control.
- **Lost** — no cross-run cache. Spotify removed batch endpoints in February
  2026, so artist genres cost one request each and are re-fetched every run.
  That is the main reason a run takes minutes rather than seconds.

If runs ever need to be resumable across sessions, or the app needs to serve
more than a handful of people, a cache table for `artist → genres` is the first
thing to add back. Nothing else needs persistence.

Browser `localStorage` holds UI preferences only (`src/features/onboarding/preferences.ts`).
Every read and write is wrapped in try/catch, because private windows and
blocked site data both throw.

## Data sources, all free and keyless

| Source          | Gives us                                 | Notes                                                                                     |
| --------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Spotify Web API | library, playlists, artists, writes      | OAuth; rate limited                                                                       |
| ReccoBeats      | tempo/BPM, energy, valence, danceability | fills the gap left by the removal of Spotify audio-features; ~75% coverage, batched by id |
| lyrics.ovh      | lyrics                                   | no key; miss rate is high for niche tracks                                                |
| MusicBrainz     | canonical metadata by ISRC               | needs a descriptive User-Agent, 1 req/s                                                   |

Anything missing degrades rather than fails: the model falls back on what it
knows about the track from its name and artist.

## Rate limiting

`src/lib/spotify/limiter.ts` layers a token bucket (paces requests) over a
concurrency cap (bounds open sockets). The rate is adaptive: Spotify does not
publish its limit, so a 429 halves it and success creeps it back up. A 429
freezes the whole bucket — letting the other in-flight calls through is what
turns one 429 into twenty. A `Retry-After` above 120s is surfaced rather than
slept through.

## Auth

Authorization Code + PKCE, with the client secret, server-side. See
`docs/spotify-api.md` for the constraints that shape it — especially the
6-month refresh token expiry and the ban on `localhost` as a redirect URI.

`requireSession()` in `src/lib/auth/require-session.ts` is the only way pages
should read the session: it refreshes the access token when needed and turns
`invalid_grant` into a re-consent redirect instead of a retry loop.
