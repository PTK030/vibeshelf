import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  /* Mark only, for tight spots like a mobile header. */
  markOnly?: boolean;
}

/*
 * Three bars of different heights: a shelf of records seen edge-on, which is
 * also where the name comes from. Deliberately nothing like Spotify's mark —
 * no circle, no waves — since their Developer Policy forbids resembling it.
 * Matches src/app/icon.svg.
 */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-surface" />
        <g className="fill-accent transition-transform duration-300 ease-out">
          <rect x="7" y="13" width="4" height="12" rx="2" />
          <rect x="14" y="7" width="4" height="18" rx="2" />
          <rect x="21" y="16" width="4" height="9" rx="2" />
        </g>
      </svg>

      {!markOnly && (
        <span className="text-base font-bold tracking-tight text-foreground">{BRAND.name}</span>
      )}
    </span>
  );
}
