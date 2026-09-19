"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { commitPlan, type CommitResult } from "@/features/organize/commit-action";
import type { Plan, PlanPlaylist } from "@/features/organize/plan";
import { PlaylistCard } from "@/features/organize/playlist-card";

function toCommitPlaylist(playlist: PlanPlaylist) {
  return {
    name: playlist.name,
    description: playlist.description.slice(0, 280),
    /* Private by default: creating public playlists unasked would be rude. */
    isPublic: false,
    trackIds: playlist.tracks.map((track) => track.id),
  };
}

interface PlanPreviewProps {
  plan: Plan;
}

/*
 * Nothing here touches Spotify. The user turns playlists on or off, then
 * commits explicitly — that is the whole point of having a preview step.
 */
export function PlanPreview({ plan }: PlanPreviewProps) {
  const [disabled, setDisabled] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<CommitResult | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const toggle = useCallback((slug: string) => {
    setDisabled((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const enabled = useMemo(
    () => plan.playlists.filter((playlist) => !disabled.has(playlist.slug)),
    [plan.playlists, disabled],
  );

  const totalTracks = useMemo(
    () => enabled.reduce((sum, playlist) => sum + playlist.tracks.length, 0),
    [enabled],
  );

  const handleCommit = useCallback(() => {
    const payload = { playlists: enabled.map(toCommitPlaylist) };

    startTransition(async () => {
      setResult(await commitPlan(payload));
    });
  }, [enabled]);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Propozycja</h2>
          <p className="mt-1 text-xs text-muted">
            {enabled.length} playlist · {totalTracks} utworów
            {plan.unassigned > 0 ? ` · ${plan.unassigned} nieprzypisanych` : ""}
          </p>
        </div>
        <QualityNote plan={plan} />
      </header>

      <div className="flex flex-col gap-3">
        {plan.playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.slug}
            playlist={playlist}
            disabled={disabled.has(playlist.slug)}
            onToggle={toggle}
          />
        ))}
      </div>

      {result === undefined ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={handleCommit} disabled={isPending || enabled.length === 0}>
            {isPending ? "Tworzę..." : `Utwórz ${enabled.length} playlist`}
          </Button>
          <p className="text-xs text-muted">Powstaną jako prywatne. Nic innego się nie zmieni.</p>
        </div>
      ) : (
        <CommitSummary result={result} />
      )}
    </section>
  );
}

function QualityNote({ plan }: { plan: Plan }) {
  const misc = Math.round(plan.quality.unassignedShare * 100);
  const tone = misc > 25 ? "warning" : "neutral";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={tone}>{misc}% nieprzypisanych</Badge>
      <Badge>{plan.usage.calls} zapytań do modelu</Badge>
      {plan.quality.hallucinatedIndices > 0 && (
        <Badge tone="warning">{plan.quality.hallucinatedIndices} błędnych indeksów</Badge>
      )}
    </div>
  );
}

function CommitSummary({ result }: { result: CommitResult }) {
  return (
    <Card className="flex flex-col gap-3">
      <p className={result.ok ? "text-sm text-accent" : "text-sm text-danger"}>{result.message}</p>
      {result.created.length > 0 && (
        <ul className="flex flex-col gap-1">
          {result.created.map((created) => (
            <li key={created.name} className="text-xs text-muted">
              {created.url === undefined ? (
                <span>
                  {created.name} — {created.trackCount} utworów
                </span>
              ) : (
                <a
                  href={created.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent hover:underline"
                >
                  {created.name} — {created.trackCount} utworów · otwórz w Spotify
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
