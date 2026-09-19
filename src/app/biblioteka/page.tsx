import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { AttributionFooter } from "@/components/layout/attribution-footer";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/require-session";
import { SpotifyClient } from "@/lib/spotify/client";

export const metadata: Metadata = { title: "Biblioteka" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await requireSession();
  const client = new SpotifyClient(session.accessToken);

  /* One page is enough to learn the size: the response carries `total`. */
  const [liked, playlists] = await Promise.all([
    client.savedTracksPage(0, 1),
    client.playlistsPage(0, 1),
  ]);

  return (
    <>
      <AppHeader displayName={session.displayName ?? undefined} showSignOut />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <h1 className="text-xl font-bold">Twoja biblioteka</h1>
        <p className="mt-3 text-sm text-muted">
          Tyle mamy do przerobienia. Analiza nic nie zmienia na Twoim koncie.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StatCard label="Polubione utwory" value={liked.total} />
          <StatCard label="Twoje playlisty" value={playlists.total} />
        </div>

        <div className="mt-8">
          <ButtonLink href="/organizuj" size="lg">
            Zaproponuj playlisty
          </ButtonLink>
        </div>
      </main>
      <AttributionFooter />
    </>
  );
}

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value.toLocaleString("pl-PL")}</p>
    </Card>
  );
}
