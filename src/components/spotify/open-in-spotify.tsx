import { SpotifyMark } from "@/components/spotify/spotify-mark";
import { cn } from "@/lib/cn";

interface OpenInSpotifyProps {
  /* `external_urls.spotify` from any Spotify object. */
  url: string;
  /* What the link points at, for screen readers: "Glue by Bicep". */
  label: string;
  className?: string;
}

/*
 * Developer Policy II.4.2 requires every piece of Spotify metadata we render to
 * link back to it. Routing all of those links through this component is what
 * makes that requirement impossible to forget.
 *
 * "OPEN SPOTIFY" is one of the wordings their guidelines allow.
 */
export function OpenInSpotify({ url, label, className }: OpenInSpotifyProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Otwórz w Spotify: ${label}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill text-2xs text-muted",
        "label-caps transition-colors duration-150",
        "hover:text-accent",
        className,
      )}
    >
      <SpotifyMark className="size-4" />
      <span>Otwórz</span>
    </a>
  );
}
