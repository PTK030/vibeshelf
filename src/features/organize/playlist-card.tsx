"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OpenInSpotify } from "@/components/spotify/open-in-spotify";
import type { PlanPlaylist } from "@/features/organize/plan";
import { cn } from "@/lib/cn";

interface PlaylistCardProps {
  playlist: PlanPlaylist;
  disabled: boolean;
  onToggle: (slug: string) => void;
}

const PREVIEW_COUNT = 5;

export function PlaylistCard({ playlist, disabled, onToggle }: PlaylistCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => onToggle(playlist.slug), [onToggle, playlist.slug]);
  const handleExpand = useCallback(() => setExpanded((current) => !current), []);

  const visible = expanded ? playlist.tracks : playlist.tracks.slice(0, PREVIEW_COUNT);
  const hidden = playlist.tracks.length - visible.length;

  return (
    <Card className={cn("flex flex-col gap-3", disabled && "opacity-50")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{playlist.name}</h3>
          <p className="mt-1 text-xs text-muted">{playlist.description}</p>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-2xs text-muted">
          <input
            type="checkbox"
            checked={!disabled}
            onChange={handleToggle}
            className="size-4 accent-accent"
          />
          Utwórz
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{playlist.tracks.length} utworów</Badge>
        {playlist.score !== undefined && (
          <Badge tone={playlist.score.score >= 70 ? "accent" : "warning"}>
            dopasowanie {playlist.score.score}/100
          </Badge>
        )}
      </div>

      {playlist.score !== undefined && (
        <p className="text-xs text-muted italic">{playlist.score.reason}</p>
      )}

      <ul className="flex flex-col">
        {visible.map((track) => (
          <li
            key={track.id}
            className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5 hover:bg-surface-hover"
          >
            <span className="min-w-0 truncate text-xs">
              <span className="text-foreground">{track.name}</span>
              <span className="text-muted"> — {track.artistNames.join(", ")}</span>
              {track.tempo !== undefined && (
                <span className="text-disabled"> · {Math.round(track.tempo)} BPM</span>
              )}
            </span>
            <OpenInSpotify
              url={track.spotifyUrl}
              label={`${track.name} — ${track.artistNames.join(", ")}`}
            />
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          onClick={handleExpand}
          className="self-start text-2xs text-muted transition-colors hover:text-foreground"
        >
          Pokaż pozostałe {hidden}
        </button>
      )}
      {expanded && playlist.tracks.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={handleExpand}
          className="self-start text-2xs text-muted transition-colors hover:text-foreground"
        >
          Zwiń
        </button>
      )}
    </Card>
  );
}
