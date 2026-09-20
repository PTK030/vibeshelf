# CLAUDE.md

AI-assisted organiser for a Spotify library: sign in with Spotify, bring your own AI key
(OpenRouter, Anthropic or OpenAI), pick a model, and let it group Liked Songs into themed
playlists — with a full preview and edit step before anything is written back to Spotify.

## Repository map

| Path                     | What's in it                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| `src/app/page.tsx`       | Landing: hero plus the Spotify sign-in button                           |
| `src/app/start`          | Onboarding after sign-in (Framer Motion)                                |
| `src/app/library`        | Signed-in home: ask box, stats, quick actions, insights                 |
| `src/app/organize`       | Run the analysis and review the plan                                    |
| `src/app/settings`       | AI provider, model and preferences                                      |
| `src/app/not-found.tsx`  | Branded 404                                                             |
| `src/app/api/auth`       | OAuth routes and sign-out                                               |
| `src/app/api/ask`        | Free-form questions; streams an answer plus links and an action         |
| `src/app/api/organize`   | The analysis run, reported over SSE                                     |
| `src/components/ui`      | Design-system primitives (button, card, toggle, progress, stagger…)     |
| `src/components/spotify` | Spotify mark, sign-in and "Open in Spotify" — carry Policy requirements |
| `src/features/*`         | Feature slices, one folder per user-facing capability                   |
| `src/lib/ai`             | Provider catalogue, prompts, chunking, reconciliation                   |
| `src/lib/spotify`        | Thin `fetch` client, adaptive rate limiter, Zod response schemas        |
| `src/lib/auth`           | Encrypted cookie session; `requireSession()` refreshes tokens           |
| `src/lib/library`        | Loading and enriching tracks from liked songs or one playlist           |
| `src/lib/enrichment`     | ReccoBeats audio features and lyric signals                             |

## Docs

`docs/` is the source of truth. "Check the docs" always means this directory, not the web.

| File                       | What's in it                                                |
| -------------------------- | ----------------------------------------------------------- |
| `docs/coding-standards.md` | Naming, modules, types, validation, error handling          |
| `docs/spotify-api.md`      | What is actually true about the API in 2026, and what broke |
| `docs/design.md`           | Design tokens, measured contrast, motion                    |
| `docs/architecture.md`     | Why there is no database, and what that costs               |

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
- **NEVER call OpenRouter without `provider: { require_parameters: true }`** when relying on
  structured output. Routing can otherwise land on an endpoint that ignores `response_format`.
- **NEVER add "sign in with Claude".** Anthropic banned third-party use of Claude
  Free/Pro/Max OAuth tokens in February 2026 and enforces it server-side; a Console API key
  is the only sanctioned route. OpenAI's "Sign in with ChatGPT" is still Codex-only.
- **NEVER build an auth redirect from `request.url`.** Next normalises it to localhost
  whatever host was used, which moves the browser off the origin holding the session
  cookie. Use `redirectToPath()`.
- **NEVER let the classifier see or return Spotify IDs.** It works on local chunk indices, so a
  hallucinated ID is structurally impossible. The ask endpoint is the exception: it does get
  ids, and every id it returns is checked against the ones we supplied before becoming a link.
- **NEVER ask a model for a URL.** Give it ids and build the URL server-side; a model will
  return a plausible invented link otherwise.
- **NEVER write to Spotify without the user approving a plan first.** Analysis is read-only.
- Every rendered track needs a link back to Spotify — a Policy requirement, not a nicety.
  Always render it with `components/spotify/open-in-spotify.tsx`.

## Conventions

kebab-case files · no barrel files · named exports · `interface` over `type` · types from
`z.infer` · validate only at boundaries. Full list in `docs/coding-standards.md`.

All user-facing copy, code, comments and docs are English.
