/*
 * Shared motion constants, so every animated surface settles on the same
 * curve. Mirrors --ease-smooth / --ease-spring in globals.css; keep them in
 * sync or CSS and Framer Motion transitions will drift apart visually.
 *
 * Tuples, not arrays: Framer Motion's Easing type requires exactly four numbers.
 */
export const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.18,
  base: 0.28,
  slow: 0.42,
} as const;

export const SECTION_TRANSITION = { duration: DURATION.slow, ease: EASE_SMOOTH } as const;
export const POP_TRANSITION = { duration: DURATION.base, ease: EASE_SMOOTH } as const;
