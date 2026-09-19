# Coding standards

Adapted from the reference repo [PTK030/paseo](https://github.com/PTK030/paseo). These are
enforced by `oxlint` + `oxfmt` where a linter can express them, and by review where it cannot.

## Naming

- **kebab-case for every file and folder**, including React components: `track-card.tsx`, not
  `TrackCard.tsx`.
- **Path is part of the name.** Prefer `spotify/client.ts` over `spotify/spotify-client.ts`.
- The suffixes `-utils`, `-helpers`, `-manager`, `-handler`, `-controller`, `-formatter` and
  `-builder` are a smell. If that is the only name you can find, the module does too much.

## Modules

- **No barrel files.** An `index.ts` that only re-exports is banned. Import from the real path.
- **Named exports only.** `export function Foo() {}`, never `export default`.
- Prefer `function` declarations over arrow-function assignments.

## Types

- `interface` over `type` for object shapes (enforced).
- **Never hand-write a type that Zod can infer.** Wire types come from `z.infer<typeof Schema>`.
- No `any`, no `as`, no `@ts-ignore`, no `@ts-expect-error`, no non-null `!`.
- Literal unions instead of bare `string`.
- Discriminated unions instead of `{ isLoading, error?, data? }`.

## Validation

Validate **only at boundaries**: network responses (Spotify, OpenRouter), form input, env,
file I/O. Inside those boundaries we trust our types — every `?.` or `??` behind a validated
boundary is a sign the boundary is in the wrong place.

## Errors

Throw typed error classes carrying the fields a caller would want to read. Branch on
`instanceof`. Never `catch (e) { return null }`.

## React

- `useEffect` only to synchronise with systems outside React.
- Never define a component inside another component.
- Stable `key`s — never the array index.
- Server state belongs in the server; do not mirror it into client state.

## Shape

- Max 3 levels of nesting; no nested ternaries.
- 3+ arguments, or any boolean/optional argument, means a parameter object.

## Comments

Delete any comment where removing it loses zero information. Code-level facts belong in
inline comments; system, process and gotcha-level facts belong in `docs/`.
