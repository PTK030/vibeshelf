import { AttributionFooter } from "@/components/layout/attribution-footer";
import { SpotifyMark } from "@/components/spotify/spotify-mark";
import { TrackRow, type TrackRowTrack } from "@/components/spotify/track-row";
import { Badge } from "@/components/ui/badge";
import { Button, PlayButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/lib/brand";

/* Placeholder rows so the kit renders without network access. */
const SAMPLE_TRACKS: TrackRowTrack[] = [
  {
    id: "1",
    name: "Glue",
    artistNames: ["Bicep"],
    albumName: "Isles",
    durationMs: 388_000,
    imageUrl: undefined,
    spotifyUrl: "https://open.spotify.com/track/1IHWl5LamUGEuP4ozKQSXZ",
  },
  {
    id: "2",
    name: "Weightless",
    artistNames: ["Marconi Union"],
    albumName: "Weightless",
    durationMs: 490_000,
    imageUrl: undefined,
    spotifyUrl: "https://open.spotify.com/track/09g0MhB8h1RcAxLc2WSSkq",
  },
  {
    id: "3",
    name: "Midnight City",
    artistNames: ["M83"],
    albumName: "Hurry Up, We're Dreaming",
    durationMs: 243_000,
    imageUrl: undefined,
    spotifyUrl: "https://open.spotify.com/track/6GByuOWKAJTGa2ZneDxHrW",
  },
];

const PLAYLIST_PREVIEW = [
  { slug: "run", name: "Do biegania", count: 84, tone: "accent" as const },
  { slug: "focus", name: "Do nauki", count: 61, tone: "neutral" as const },
  { slug: "melanch", name: "Melancholia wieczorem", count: 47, tone: "neutral" as const },
  { slug: "_misc", name: "Nieprzypisane", count: 12, tone: "warning" as const },
];

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PlanPreviewCard() {
  return (
    <Card interactive className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PlanPreviewHeading />
        <PlayButton label="Odtwórz podgląd playlisty Do biegania">
          <PlayIcon />
        </PlayButton>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="accent">84 utwory</Badge>
        <Badge>electronic</Badge>
        <Badge>punk</Badge>
      </div>
    </Card>
  );
}

function PlanPreviewHeading() {
  return (
    <div>
      <h3 className="text-base font-bold">Do biegania</h3>
      <p className="mt-1 text-xs text-muted">Wysokie tempo, mocny puls, bez długich intr.</p>
    </div>
  );
}

function JobProgressCard() {
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-base font-bold">Postęp analizy</h3>
      <Progress value={0.62} label="Pobieranie gatunków artystów" />
      <Progress value={0.18} label="Klasyfikacja utworów" />
      <div className="flex flex-col gap-2 pt-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}

function LikedTracksCard() {
  return (
    <Card className="mt-8 p-2">
      <div className="flex items-center justify-between px-2 py-2">
        <h3 className="text-sm font-bold">Polubione utwory</h3>
        <span className="flex items-center gap-2 text-2xs text-muted">
          <SpotifyMark className="size-4" />
          Spotify
        </span>
      </div>
      {SAMPLE_TRACKS.map((track, index) => (
        <TrackRow key={track.id} track={track} index={index} />
      ))}
    </Card>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-20 pb-16">
      <p className="label-caps mb-4 text-2xs text-accent">{BRAND.qualifier}</p>
      <h1 className="max-w-3xl text-3xl leading-tight font-black text-balance">{BRAND.tagline}</h1>
      <p className="mt-5 max-w-xl text-base text-muted">{BRAND.description}</p>
      <div className="mt-9 flex flex-wrap items-center gap-4">
        <Button size="lg">Zaloguj przez Spotify</Button>
        <Button variant="secondary" size="lg">
          Jak to działa
        </Button>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <main className="flex-1">
        <Hero />

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <h2 className="mb-6 text-lg font-bold">Podgląd planu</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanPreviewCard />
            <JobProgressCard />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PLAYLIST_PREVIEW.map((playlist) => (
              <Badge key={playlist.slug} tone={playlist.tone}>
                {playlist.name} · {playlist.count}
              </Badge>
            ))}
          </div>

          <LikedTracksCard />

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="spotify">Otwórz w Spotify</Button>
            <Button variant="secondary">Edytuj plan</Button>
            <Button variant="ghost">Odrzuć</Button>
            <Button variant="danger">Usuń z biblioteki</Button>
            <Button disabled>Zapisz</Button>
          </div>
        </section>
      </main>
      <AttributionFooter />
    </>
  );
}
