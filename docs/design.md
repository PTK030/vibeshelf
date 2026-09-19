# Design system

The app is dark-only and uses Spotify's green as its accent. Structure (surface
ladder, pill buttons, radii, spacing, letter-spaced button labels) follows the
patterns people already recognise from music apps.

Sources are marked: **[OFFICIAL]** = `developer.spotify.com/documentation/design`,
**[RE]** = reverse-engineered from the web player — consistent across independent
sources but not authoritative, since Spotify does not publish the tokens of its
internal design system (Encore).

## Accent

| Token                  | Value     | Notes                           |
| ---------------------- | --------- | ------------------------------- |
| `--color-accent`       | `#1ed760` | Spotify Bright Green            |
| `--color-accent-hover` | `#1fdf64` |                                 |
| `--color-accent-press` | `#1db954` | the older, darker Spotify green |
| `--color-on-accent`    | `#000000` | 10.9:1 on the accent            |

Note for whoever registers the app: Spotify's Developer Policy restricts using
their green in an app's _own_ logo and forbids implying endorsement. The name in
the Developer Dashboard must not contain "Spotify", and the non-affiliation
notice in the footer must stay.

## Surfaces [RE]

| Token                   | Value     | Use                 |
| ----------------------- | --------- | ------------------- |
| `--color-base`          | `#000000` | sidebar, top bar    |
| `--color-background`    | `#121212` | app background      |
| `--color-surface`       | `#181818` | cards               |
| `--color-surface-hover` | `#282828` | card hover          |
| `--color-elevated`      | `#242424` | popovers, dropdowns |

## Contrast

Every foreground token clears WCAG AA (4.5:1) against all three surfaces
(`#121212`, `#181818`, `#282828`), and `--color-border-strong` clears the 3:1
that WCAG 1.4.11 requires for control outlines. Two tokens were corrected after
measurement: `--color-disabled` (`#6a6a6a` → `#909090`, was 3.5:1) and
`--color-border-strong` (`#404040` → `#757575`).

Re-measure before changing any of these.

## Radii

`2px` badge · `4px` inputs and small artwork **[OFFICIAL]** · `8px` cards and
large artwork **[OFFICIAL]** · `12px` modals · `500px` pill buttons **[RE]** ·
`50%` avatars.

## Type

**Figtree** via `next/font/google`. Spotify's own faces (Spotify Mix, custom
Circular) are not licensable, and Spotify's partner guidelines tell integrators
to use a platform sans-serif. Figtree is a geometric grotesque built as a free
Circular alternative.

Button labels: uppercase, weight 700, `letter-spacing: 0.1em`.

## Motion

`--duration-fast: 180ms`, `--duration-base: 280ms`, `--duration-slow: 420ms`.

Easing matters more than duration here. A plain `ease-out` decelerates almost
linearly, which is what makes a short transition read as an on/off switch —
`--ease-smooth` (`cubic-bezier(0.22, 1, 0.36, 1)`) leaves fast and settles slow,
so the eye sees movement instead of a state change. `--ease-spring` adds a
slight overshoot, used only on the toggle knob.

Framer Motion mirrors these in `src/lib/motion.ts`. Keep the two in sync, or
CSS and JS animation will visibly drift apart.

Anything that appears or disappears conditionally belongs in `AnimatePresence`
with an exit variant. Mounting straight into the tree is the other half of what
makes UI feel binary.

Animate sections, not routes. A route-level wrapper fades the whole page in as
one slab — header and footer included — and gives the eye nothing to follow.
`Stagger` / `StaggerItem` (`src/components/ui/stagger.tsx`) build the page in
reading order instead; the parent holds the variants, so children need no
per-item delay prop.

`prefers-reduced-motion` is honoured globally in `globals.css`.

Framer Motion takes object props, which trips `react-perf/jsx-no-new-object-as-prop`.
Hoist animation objects to module constants, or use `variants` with `custom`
for per-item delays, rather than suppressing the rule.

## Cursors

Tailwind v4's preflight sets `button { cursor: default }`, matching the browser
default rather than the expectation. `globals.css` restores `pointer` for
buttons, selects, summaries, checkboxes and labels wrapping one, and uses
`not-allowed` for disabled controls. Do not re-add `cursor-pointer` per
component — it is handled once in base.

## Logo

A geometric V monogram (`src/components/layout/logo.tsx`, mirrored in
`src/app/icon.svg`). The first attempt was three vertical bars — that is the
equaliser motif every Spotify-stats app already uses, and too close to
Spotify's own visual language. The mark must not contain a circle, sound waves
or their green in a way that reads as their logo.
