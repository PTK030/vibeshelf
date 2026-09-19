# Design system

The goal: the app should feel like it belongs next to Spotify, while being unmistakably its
own product. We copy the _structure_ (dark surface ladder, pill buttons, radii, spacing,
letter-spaced button labels) and deliberately **do not** copy the brand (their green, their
typeface, their logo, their name).

Sources are marked: **[OFFICIAL]** = `developer.spotify.com/documentation/design`,
**[RE]** = reverse-engineered from the web player, consistent across independent sources but
not authoritative. Spotify does not publish the tokens of its internal design system (Encore).

## The one rule that keeps this legal and honest

`--color-accent` (mint) carries the interface. `--color-spotify` (#1ED760) appears **only** on
elements that actually lead to Spotify — "Open in Spotify" buttons and attribution. Spotify's
Developer Policy forbids an app's own branding from using their green.

## Surfaces [RE]

| Token                   | Value     | Use                                               |
| ----------------------- | --------- | ------------------------------------------------- |
| `--color-base`          | `#000000` | sidebar, top bar                                  |
| `--color-background`    | `#121212` | app background                                    |
| `--color-surface`       | `#181818` | cards                                             |
| `--color-surface-hover` | `#282828` | card hover — this move is what reads as "Spotify" |
| `--color-elevated`      | `#242424` | popovers, dropdowns                               |

## Radii

`2px` badge · `4px` inputs and small artwork **[OFFICIAL]** · `8px` cards and large artwork
**[OFFICIAL]** · `12px` modals · `500px` pill buttons **[RE]** · `50%` avatars.

## Type

**Figtree** via `next/font/google`. Spotify's own faces (Spotify Mix since 2024, custom
Circular before) are not publicly licensable, and Spotify's own partner guidelines tell you to
use a platform sans-serif. Figtree is a geometric grotesque designed as a free Circular/Gotham
alternative: high x-height, open counters — same character without imitation.

Button labels: uppercase, weight 700, `letter-spacing: 0.1em`. This detail does more for the
"Spotify feel" than the colours do.

## Motion

`--duration-fast: 150ms`, `--duration-base: 200ms`, `ease`. Button hover `scale(1.04)`.
Card hover raises the background one step on the surface ladder.
