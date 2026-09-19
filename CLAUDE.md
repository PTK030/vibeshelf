# CLAUDE.md

AI-assisted organiser for a Spotify library: sign in with Spotify, bring your own OpenRouter
key, pick a model, and let it group Liked Songs into themed playlists — with a full preview
and edit step before anything is written back to Spotify.

## Repository map

| Path                     | What's in it                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| `src/app/(marketing)`    | Landing page, sign-in entry point                                       |
| `src/app/(app)`          | Authenticated shell: library, organize, plans, cleanup, settings        |
| `src/app/api`            | OAuth callbacks, job tick/stream/sweep route handlers                   |
| `src/components/ui`      | Design-system primitives (button, card, dialog, progress…)              |
| `src/components/spotify` | Spotify mark, sign-in and "Open in Spotify" — carry Policy requirements |
| `src/features/*`         | Feature slices, one folder per user-facing capability                   |
| `src/lib/spotify`        | Thin `fetch` client, adaptive rate limiter, Zod response schemas        |
| `src/lib/openrouter`     | Model list, key validation, structured-output calls                     |
| `src/lib/db`             | Drizzle schema and migrations                                           |
| `src/lib/jobs`           | `runJobSlice` state machine, step handlers, SSE events                  |
| `proxy.ts`               | Next 16's renamed middleware — guards the `(app)` group                 |

## Docs

`docs/` is the source of truth. "Check the docs" always means this directory, not the web.

| File                       | What's in it                                                |
| -------------------------- | ----------------------------------------------------------- |
| `docs/coding-standards.md` | Naming, modules, types, validation, error handling          |
| `docs/spotify-api.md`      | What is actually true about the API in 2026, and what broke |
| `docs/design.md`           | Design tokens and the brand boundary we must not cross      |

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://127.0.0.1:3000
```

There is no database — see `docs/architecture.md`.

## Critical rules

- **NEVER use `localhost`.** Spotify rejects it as a redirect URI. Dev runs on `127.0.0.1`.
  Visiting `localhost:3000` in the browser puts the session cookie on the wrong origin.
- **NEVER assume a batch Spotify endpoint exists.** They were removed in February 2026.
- **NEVER treat `invalid_grant` as retryable.** It means the 6-month refresh token expired:
  discard it and send the user through consent again.
- **NEVER call an LLM without `provider: { require_parameters: true }`** when relying on
  structured output. Routing can otherwise land on a provider that ignores `response_format`.
- **NEVER let the model see or return Spotify IDs.** It works on local chunk indices, so a
  hallucinated ID is structurally impossible.
- **NEVER write to Spotify without the user approving a plan first.** Analysis is read-only.
- Every rendered track needs a link back to Spotify — a Policy requirement, not a nicety.
  Always render it with `components/spotify/open-in-spotify.tsx`.

## Conventions

kebab-case files · no barrel files · named exports · `interface` over `type` · types from
`z.infer` · validate only at boundaries. Full list in `docs/coding-standards.md`.

UI copy is Polish. Code, comments and docs are English.
