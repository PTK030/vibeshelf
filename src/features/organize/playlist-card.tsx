"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OpenInSpotify } from "@/components/spotify/open-in-spotify";
import type { PlanPlaylist } from "@/features/organize/plan";
import { SECTION_TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/cn";

function TrackLine({ track }: { track: PlanPlaylist["tracks"][number] }) {
  const artists = track.artistNames.join(", ");

  return (
    <li className="flex items-center justify-between gap-3 rounded-sm px-1 py-1.5 transition-colors duration-180 ease-smooth hover:bg-surface-hover">
      <span className="min-w-0 truncate text-xs">
        <span className="text-foreground">{track.name}</span>
        <span className="text-muted"> — {artists}</span>
        {track.tempo !== undefined && (
          <span className="text-disabled"> · {Math.round(track.tempo)} BPM</span>
        )}
      </span>
      <OpenInSpotify url={track.spotifyUrl} label={`${track.name} — ${artists}`} />
    </li>
  );
}

interface PlaylistCardProps {
  playlist: PlanPlaylist;
  disabled: boolean;
  onToggle: (slug: string) => void;
}

const PREVIEW_COUNT = 5;

const REVEAL = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};
const REVEAL_TRANSITION = SECTION_TRANSITION;

export function PlaylistCard({ playlist, disabled, onToggle }: PlaylistCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => onToggle(playlist.slug), [onToggle, playlist.slug]);
  const handleExpand = useCallback(() => setExpanded((current) => !current), []);

  const preview = playlist.tracks.slice(0, PREVIEW_COUNT);
  const rest = playlist.tracks.slice(PREVIEW_COUNT);

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
        {preview.map((track) => (
          <TrackLine key={track.id} track={track} />
        ))}
      </ul>

      <AnimatePresence initial={false}>
        {expanded && rest.length > 0 && (
          <motion.ul
            initial={REVEAL.initial}
            animate={REVEAL.animate}
            exit={REVEAL.exit}
            transition={REVEAL_TRANSITION}
            className="flex flex-col overflow-hidden"
          >
            {rest.map((track) => (
              <TrackLine key={track.id} track={track} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {rest.length > 0 && (
        <button
          type="button"
          onClick={handleExpand}
          className="self-start text-2xs text-muted transition-colors duration-180 ease-smooth hover:text-foreground"
        >
          {expanded ? "Zwiń" : `Pokaż pozostałe ${rest.length}`}
        </button>
      )}
    </Card>
  );
}
