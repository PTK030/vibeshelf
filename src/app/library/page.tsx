import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OpenInSpotify } from "@/components/spotify/open-in-spotify";
import { SpotifyMark } from "@/components/spotify/spotify-mark";
import { buildInsights, type Insight } from "@/features/library/insights";
import type { PlayedPlaylist } from "@/features/library/recent-playlists";
import { AskAi } from "@/features/library/ask-ai";
import { QuickActions } from "@/features/library/quick-actions";
import { recentlyPlayedPlaylists } from "@/features/library/recent-playlists";
import { providerMeta } from "@/lib/ai/providers";
import { requireSession } from "@/lib/auth/require-session";
import { SpotifyClient } from "@/lib/spotify/client";
import { formatDuration } from "@/lib/library/track";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await requireSession();
  const client = new SpotifyClient(session.accessToken);

  /*
   * Four cheap calls. Top items carry genres on the artist object, so the page
   * has real content without the hundreds of per-artist lookups a full scan
   * would cost.
   */
  const [liked, playlists, topArtists, topTracks, playedPlaylists] = await Promise.all([
    client.savedTracksPage(0, 5),
    client.playlistsPage(0, 1),
    client.topArtists(8).catch(() => ({ items: [] })),
    client.topTracks(5).catch(() => ({ items: [] })),
    /*
     * Returns nothing for sessions authorised before user-read-recently-played
     * was added — an empty section is the right answer, not an error.
     */
    recentlyPlayedPlaylists(client).catch(() => []),
  ]);

  const insights = buildInsights({
    likedTotal: liked.total,
    playlistTotal: playlists.total,
    topArtistGenres: topArtists.items.map((artist) => artist.genres ?? []),
  });

  const recent = liked.items.flatMap((item) => (item.track === null ? [] : [item.track]));
  const connected = session.ai === undefined ? undefined : providerMeta(session.ai.provider);

  return (
    <>
      <AppHeader session={session} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Hi{session.displayName === null ? "" : `, ${session.displayName}`}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {connected === undefined
                ? "Connect an AI model to start sorting."
                : `Ready to work through ${connected.name}.`}
            </p>
          </div>

          <div className="flex gap-6">
            <Stat label="Liked" value={liked.total} />
            <Stat label="Playlists" value={playlists.total} />
            <Stat label="Top artists" value={topArtists.items.length} />
          </div>
        </div>

        {connected === undefined && (
          <Card className="mt-8 border border-warning/40">
            <p className="text-sm text-warning">
              No model is connected yet.{" "}
              <Link href="/settings" className="underline">
                Connect one in settings
              </Link>
              . It takes a moment.
            </p>
          </Card>
        )}

        <section className="mt-10">
          <AskAi enabled={connected !== undefined} />
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold text-muted">Where to start</h2>
          <QuickActions />
        </section>

        {insights.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-sm font-semibold text-muted">What we see in your library</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {insights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {topArtists.items.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold text-muted">Your artists</h2>
              <Card className="flex flex-wrap gap-2 p-4">
                {topArtists.items.map((artist) => (
                  <ArtistChip
                    key={artist.id}
                    name={artist.name}
                    imageUrl={artist.images?.[0]?.url}
                    url={
                      artist.external_urls?.spotify ??
                      `https://open.spotify.com/artist/${artist.id}`
                    }
                  />
                ))}
              </Card>
            </section>
          )}

          {recent.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold text-muted">Recently liked</h2>
              <Card className="flex flex-col p-2">
                {recent.map((track) => (
                  <RecentRow key={track.id} track={track} />
                ))}
              </Card>
            </section>
          )}
        </div>

        {playedPlaylists.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-1 text-sm font-semibold text-muted">Most played playlists</h2>
            <p className="mb-4 text-2xs text-disabled">
              From the last 50 plays — Spotify exposes no longer history.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {playedPlaylists.map((playlist) => (
                <PlayedPlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </section>
        )}

        {topTracks.items.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-sm font-semibold text-muted">Most played</h2>
            <div className="flex flex-wrap gap-2">
              {topTracks.items.map((track) => (
                <a
                  key={track.id ?? track.name}
                  href={
                    track.external_urls?.spotify ??
                    `https://open.spotify.com/track/${track.id ?? ""}`
                  }
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-badge transition-opacity duration-350 ease-smooth hover:opacity-80"
                >
                  <Badge>
                    {track.name} · {track.artists[0]?.name ?? "?"}
                  </Badge>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      <AttributionFooter />
    </>
  );
}

interface RecentTrack {
  id: string | null;
  name: string;
  artists: Array<{ name: string }>;
  duration_ms: number;
  external_urls?: { spotify: string } | undefined;
}

function RecentRow({ track }: { track: RecentTrack }) {
  const artists = track.artists.map((artist) => artist.name).join(", ");
  const url = track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id ?? ""}`;

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm px-2 py-2 transition-colors duration-350 ease-smooth hover:bg-surface-hover">
      <span className="min-w-0 truncate text-xs">
        <span className="text-foreground">{track.name}</span>
        <span className="text-muted"> — {artists}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="text-2xs tabular-nums text-disabled">
          {formatDuration(track.duration_ms)}
        </span>
        <OpenInSpotify url={url} label={`${track.name} — ${artists}`} />
      </span>
    </div>
  );
}

interface ArtistChipProps {
  name: string;
  imageUrl: string | undefined;
  url: string;
}

function ArtistChip({ name, imageUrl, url }: ArtistChipProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Open ${name} w Spotify`}
      className="flex items-center gap-2 rounded-pill bg-elevated py-1 pr-3 pl-1 transition-colors duration-350 ease-smooth hover:bg-surface-hover"
    >
      {imageUrl === undefined ? (
        <span className="size-6 rounded-full bg-surface-hover" />
      ) : (
        <Image
          src={imageUrl}
          alt=""
          width={24}
          height={24}
          className="size-6 rounded-full object-cover"
        />
      )}
      <span className="text-xs text-foreground">{name}</span>
    </a>
  );
}

const INSIGHT_BORDER: Record<Insight["tone"], string> = {
  accent: "border-accent/30",
  warning: "border-warning/30",
  neutral: "border-border",
};

function PlayedPlaylistCard({ playlist }: { playlist: PlayedPlaylist }) {
  const details = [
    `${playlist.plays} ${playlist.plays === 1 ? "play" : "plays"}`,
    playlist.trackCount === undefined ? undefined : `${playlist.trackCount} tracks`,
    playlist.owner,
  ].filter((part) => part !== undefined);

  return (
    <a
      href={playlist.spotifyUrl}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Open ${playlist.name} in Spotify`}
      className="flex items-center gap-3 rounded-md bg-surface p-3 transition-colors duration-350 ease-smooth hover:bg-surface-hover"
    >
      {playlist.imageUrl === undefined ? (
        <span className="size-12 shrink-0 rounded-sm bg-elevated" aria-hidden="true" />
      ) : (
        <Image
          src={playlist.imageUrl}
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-sm object-cover"
        />
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {playlist.name}
        </span>
        <span className="mt-0.5 block truncate text-2xs text-muted">{details.join(" · ")}</span>
      </span>

      <SpotifyMark className="size-5 shrink-0" />
    </a>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value.toLocaleString("en-GB")}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card className={`border ${INSIGHT_BORDER[insight.tone]}`}>
      <p className="text-sm font-semibold text-foreground">{insight.title}</p>
      <p className="mt-1 text-xs text-muted">{insight.body}</p>
    </Card>
  );
}
