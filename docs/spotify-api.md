# Spotify Web API — what is actually true in 2026

Every claim here was verified against `developer.spotify.com` directly. Any tutorial or
Stack Overflow answer older than March 2026 is wrong about the playlist endpoints.

## Endpoints that changed (February 2026 migration)

| Removed                                      | Use instead                    |
| -------------------------------------------- | ------------------------------ |
| `POST /users/{user_id}/playlists`            | `POST /me/playlists`           |
| `GET/POST/PUT/DELETE /playlists/{id}/tracks` | `/playlists/{id}/items`        |
| `PUT/DELETE /me/tracks`                      | `PUT/DELETE /me/library`       |
| `GET /artists?ids=`, `GET /tracks?ids=`      | `/{id}` only, one request each |

The `tracks` field on a Playlist object was renamed to `items`.

`GET /me/tracks` (Liked Songs) is unchanged: `limit` max 50, response includes `total`.

## There are no batch endpoints any more

Quote from the migration guide: _"The following batch endpoints are no longer available.
Fetch items individually instead."_

This is the single biggest cost driver in this app. Genres for 900 artists means 900
requests. Hence `artists_cache` is global and effectively permanent.

## There are no audio features

Since 27 Nov 2024, apps that were not already in extended quota mode get `403` from
`audio-features`, `audio-analysis`, `recommendations`, `related-artists`, and get no
`preview_url`. This app is new, so it has none of them. "Vibe" comes from the LLM's world
knowledge, not from numbers.

`genres` on the Artist object still works but is marked **Deprecated**. Treat it as an
accelerator, never a dependency — see the `name_only` mode in the ingest pipeline.

## OAuth

- Authorization Code + PKCE. Implicit Grant was removed 27 Nov 2025.
- **`localhost` is rejected as a redirect URI.** Use `http://127.0.0.1:3000` in development.
  Production must be HTTPS. Stay on `127.0.0.1` for the whole dev flow or the session cookie
  lands on a different origin.
- Read `expires_in` from the response; the docs do not state a value.
- A refresh response may or may not contain a new `refresh_token`. If it does, overwrite;
  if it does not, keep the old one.
- **Refresh tokens expire 6 months after the original authorization**, and refreshing does
  not extend that. Expiry returns `400 invalid_grant` — that means re-consent, never retry.
- Key users by `account_id`, not `id`.

## Quota

Development Mode allows **5 allowlisted users** and requires the app owner to have Spotify
Premium. Extended Quota needs 250k MAU and a registered organisation, so it is out of reach
here. This is a personal tool by design.

## Rate limits

Rolling 30-second window, count undisclosed, `429` + `Retry-After` in seconds. A `429`
freezes the whole queue, not just the failing request. Playlist cover upload has its own,
stricter limit.

## Policy requirements that are load-bearing in the UI

1. Every displayed track must link back to Spotify (`external_urls.spotify`).
2. Spotify metadata must be accompanied by the Spotify brand (unmodified logo, min 70px).
3. Album art must not be modified, cropped to shapes, overlaid or animated.
4. Footer must say the app is not affiliated with Spotify AB.
5. The app name registered in the dashboard must not contain "Spotify".
6. Spotify Content must not be used to train a model. Inference for categorisation is fine;
   hoarding the catalogue is not.
