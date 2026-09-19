import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  /* Mark only, for tight spots like a mobile header. */
  markOnly?: boolean;
}

/*
 * A geometric V monogram.
 *
 * The earlier mark was three vertical bars, which is the equaliser motif every
 * Spotify-stats app already uses — recognisable as someone else's, and close
 * enough to Spotify's own visual language to be a bad idea. A monogram is ours.
 *
 * Kept in sync with src/app/icon.svg.
 */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
        /* `block` kills the inline baseline gap that knocked this off-centre. */
        className="block size-7 shrink-0"
      >
        <path
          d="M8.5 9.5 L16 22.5 L23.5 9.5"
          fill="none"
          className="stroke-accent"
          strokeWidth="4.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {!markOnly && (
        <span className="text-base leading-none font-bold tracking-tight text-foreground">
          {BRAND.name}
        </span>
      )}
    </span>
  );
}
