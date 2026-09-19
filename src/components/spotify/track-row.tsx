import Image from "next/image";
import { OpenInSpotify } from "@/components/spotify/open-in-spotify";
import { cn } from "@/lib/cn";

export interface TrackRowTrack {
  id: string;
  name: string;
  artistNames: string[];
  albumName: string;
  durationMs: number;
  /* Album art, rendered unmodified as the guidelines require. */
  imageUrl: string | undefined;
  /* external_urls.spotify — mandatory, see OpenInSpotify. */
  spotifyUrl: string;
}

interface TrackRowProps {
  track: TrackRowTrack;
  index?: number;
  className?: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, index, className }: TrackRowProps) {
  const artists = track.artistNames.join(", ");

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_2.5rem_1fr_auto] items-center gap-3 rounded-sm px-2 py-2",
        "transition-colors duration-150 hover:bg-surface-hover",
        className,
      )}
    >
      <span className="w-6 text-right text-sm tabular-nums text-muted">
        {index === undefined ? "" : index + 1}
      </span>

      {track.imageUrl === undefined ? (
        <div className="size-10 rounded-sm bg-elevated" aria-hidden="true" />
      ) : (
        <Image
          src={track.imageUrl}
          alt={`Okładka albumu ${track.albumName}`}
          width={40}
          height={40}
          className="size-10 rounded-sm object-cover"
        />
      )}

      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{track.name}</p>
        <p className="truncate text-xs text-muted">{artists}</p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs tabular-nums text-muted">{formatDuration(track.durationMs)}</span>
        <OpenInSpotify
          url={track.spotifyUrl}
          label={`${track.name} — ${artists}`}
          className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
        />
      </div>
    </div>
  );
}
