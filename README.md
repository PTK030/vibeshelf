# Vibeshelf

Groups your Spotify Liked Songs into themed playlists using an AI model you
bring yourself. Sign in with Spotify, connect Claude, ChatGPT or OpenRouter,
and review the proposed playlists before anything is written to your account.

Not affiliated with Spotify AB.

## What it does

- Reads your Liked Songs, playlists and listening history
- Enriches tracks with BPM, energy and mood, plus signals derived from lyrics
- Proposes a set of themed playlists ("do biegania", "do nauki", "na wieczór")
- Scores each proposal against your actual taste and explains the score
- Lets you edit or drop playlists **before** committing them to Spotify
- Answers free-form questions about your library

## Constraints worth knowing before you build on this

Three things about the Spotify API in 2026 shape most of the design. All are
verified against the docs, not assumed — details in [`docs/spotify-api.md`](docs/spotify-api.md).

**There are no audio features.** Since November 2024, apps not already in
extended quota mode get `403` from `audio-features`, `audio-analysis` and
`recommendations`. BPM, energy and valence come from
[ReccoBeats](https://reccobeats.com) instead — free, keyless, roughly 75%
coverage on a mixed library.

**There are no batch endpoints.** February 2026 removed `GET /artists`,
`GET /tracks` and the rest, so artist genres cost one request each. The
playlist routes were renamed at the same time (`/playlists/{id}/items`,
`POST /me/playlists`), which makes most tutorials older than March 2026 wrong.

**Development Mode allows 5 users** on an allowlist, and the app owner needs
Spotify Premium. Extended quota requires 250k MAU and a registered
organisation, so this is a personal tool by design.

## Stack

Next.js 16 (App Router, Turbopack) · React 19.2 · Tailwind v4 · TypeScript
strict · Zod · Vercel AI SDK · Framer Motion · oxlint + oxfmt · Vitest

**No database.** Spotify tokens, the AI key and who you are all fit in one
encrypted cookie (JWE). The trade-off — no cross-run cache, so artist genres
are re-fetched each run — is written up in [`docs/architecture.md`](docs/architecture.md).

## Running it

You need a Spotify app registered at
[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
from a **Premium** account, with the redirect URI set to exactly
`http://127.0.0.1:3000/api/auth/spotify/callback`, and your own account added
to the user allowlist.

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Generate the secrets with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Open **http://127.0.0.1:3000** — not `localhost`. Spotify rejects `localhost`
as a redirect URI, and the two are different cookie origins, so a session
started on one is invisible to the other. The sign-in route redirects you if
you get it wrong.

## Bringing your own model

| Provider           | How                       |
| ------------------ | ------------------------- |
| OpenRouter         | API key, or OAuth         |
| Claude (Anthropic) | API key from the Console  |
| ChatGPT (OpenAI)   | API key from the platform |

There is no "sign in with Claude": Anthropic banned third-party use of
Claude Free/Pro/Max OAuth tokens in February 2026 and enforces it server-side.
OpenAI's "Sign in with ChatGPT" exists but still only ships inside Codex
tooling. API keys are the sanctioned route for both.

Your key is stored encrypted in your own session cookie and never sent to the
browser or anywhere else.

## Commands

```bash
npm run dev          # 127.0.0.1:3000
npm run build
npm run typecheck
npm run lint
npm run format
npm test
```

## Docs

| File                                                   | What's in it                                |
| ------------------------------------------------------ | ------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)         | Why there is no database, and what it costs |
| [`docs/spotify-api.md`](docs/spotify-api.md)           | What is actually true about the API in 2026 |
| [`docs/design.md`](docs/design.md)                     | Design tokens, measured contrast, motion    |
| [`docs/coding-standards.md`](docs/coding-standards.md) | Naming, modules, types, validation          |
