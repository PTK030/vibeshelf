import { SpotifyMark } from "@/components/spotify/spotify-mark";
import { BRAND } from "@/lib/brand";

/*
 * Two Policy requirements live here: metadata must be accompanied by the
 * Spotify brand, and we must not imply any endorsement. Both are non-optional,
 * so this footer ships on every page.
 */
export function AttributionFooter() {
  return (
    <footer className="border-t border-border px-6 py-8 text-xs text-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <span>Music data provided by</span>
          <SpotifyMark className="size-5" />
          <span className="font-semibold text-foreground">Spotify</span>
        </p>
        <p>
          {BRAND.name}. {BRAND.disclaimer}
        </p>
      </div>
    </footer>
  );
}
