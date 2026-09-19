import { organizeLibrary, scorePlaylists } from "@/lib/ai/organize";
import { requireSessionForApi } from "@/lib/auth/api-session";
import { loadLibrary } from "@/lib/library/load";
import { SpotifyClient } from "@/lib/spotify/client";
import { z } from "zod";

/*
 * The whole run happens inside one request and reports progress over SSE.
 * With no database there is nothing to resume from, so the ceiling on library
 * size is deliberate: 300s is the Vercel Hobby maximum.
 */
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  taxonomyModel: z.string().min(1),
  classifyModel: z.string().min(1),
  userPrompt: z.string().max(500).optional(),
  deepAnalysis: z.boolean().default(true),
  playlistScoring: z.boolean().default(true),
  maxTracks: z.number().int().min(50).max(3000).default(1500),
});

/* Phase weights keep the bar monotonic instead of jumping between stages. */
const WEIGHTS = { liked: 0.12, artists: 0.33, features: 0.1, lyrics: 0.05, classify: 0.4 };

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const session = await requireSessionForApi();
  if (session === undefined) {
    return Response.json({ error: "No session" }, { status: 401 });
  }
  if (session.ai === undefined) {
    return Response.json({ error: "No AI provider connected" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;
  const ai = session.ai;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      let progress = 0;
      const emitProgress = (phase: string, fraction: number, label: string) => {
        progress = Math.max(progress, fraction);
        send("progress", { phase, progress, label });
      };

      try {
        const client = new SpotifyClient(session.accessToken);

        send("phase", { phase: "liked", label: "Reading your liked songs" });

        const library = await loadLibrary(client, {
          maxTracks: input.maxTracks,
          deepAnalysis: input.deepAnalysis,
          lyricsSampleSize: input.deepAnalysis ? 40 : 0,
          signal: request.signal,
          onProgress: (update) => {
            const ratio = update.total === 0 ? 0 : update.done / update.total;
            if (update.phase === "liked") {
              emitProgress("liked", WEIGHTS.liked * ratio, "Reading your liked songs");
            } else if (update.phase === "artists") {
              emitProgress(
                "artists",
                WEIGHTS.liked + WEIGHTS.artists * ratio,
                update.note === "name_only"
                  ? "Spotify gives no genres — relying on the model’s knowledge"
                  : "Fetching artist genres",
              );
            } else if (update.phase === "features") {
              emitProgress(
                "features",
                WEIGHTS.liked + WEIGHTS.artists + WEIGHTS.features * ratio,
                "Pulling BPM and mood",
              );
            } else {
              emitProgress(
                "lyrics",
                WEIGHTS.liked + WEIGHTS.artists + WEIGHTS.features + WEIGHTS.lyrics * ratio,
                "Analysing lyrics",
              );
            }
          },
        });

        send("library", {
          tracks: library.tracks.length,
          totalLiked: library.totalLiked,
          duplicatesRemoved: library.duplicatesRemoved,
          genreCoverage: library.genreCoverage,
          featureCoverage: library.featureCoverage,
          nameOnlyMode: library.nameOnlyMode,
        });

        /* The user's own playlist names are a strong hint about how they think. */
        const playlistNames: string[] = [];
        try {
          const page = await client.playlistsPage(0, 50);
          for (const playlist of page.items) {
            if (playlist !== null) playlistNames.push(playlist.name);
          }
        } catch {
          /* Optional signal; a failure here must not stop the run. */
        }

        send("phase", { phase: "taxonomy", label: "Designing the playlist set" });

        const base = WEIGHTS.liked + WEIGHTS.artists + WEIGHTS.features + WEIGHTS.lyrics;
        const result = await organizeLibrary(
          library.tracks,
          {
            provider: ai.provider,
            apiKey: ai.key,
            taxonomyModel: input.taxonomyModel,
            classifyModel: input.classifyModel,
            userPrompt: input.userPrompt,
            existingPlaylistNames: playlistNames,
            signal: request.signal,
          },
          (update) => {
            const ratio = update.total === 0 ? 0 : update.done / update.total;
            emitProgress(
              "classify",
              base + WEIGHTS.classify * ratio,
              `Assigning tracks (${update.done}/${update.total})`,
            );
          },
        );

        if (input.playlistScoring && result.playlists.length > 0) {
          send("phase", { phase: "scoring", label: "Scoring the playlists" });
          try {
            const scores = await scorePlaylists(result.playlists, {
              provider: ai.provider,
              apiKey: ai.key,
              taxonomyModel: input.taxonomyModel,
              classifyModel: input.classifyModel,
              signal: request.signal,
            });
            const bySlug = new Map(scores.map((score) => [score.slug, score]));
            for (const playlist of result.playlists) {
              playlist.score = bySlug.get(playlist.slug);
            }
          } catch {
            /* Scoring is a bonus; never fail a finished plan over it. */
          }
        }

        send("plan", {
          playlists: result.playlists.map((playlist) => ({
            slug: playlist.slug,
            name: playlist.name,
            description: playlist.description,
            score: playlist.score,
            tracks: playlist.tracks.map((track) => ({
              id: track.id,
              name: track.name,
              artistNames: track.artistNames,
              albumName: track.albumName,
              durationMs: track.durationMs,
              imageUrl: track.imageUrl,
              spotifyUrl: track.spotifyUrl,
              tempo: track.features?.tempo,
            })),
          })),
          unassigned: result.unassigned.length,
          usage: result.usage,
          quality: result.quality,
        });

        send("done", { ok: true });
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "The analysis failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      /* Stops proxies buffering the stream into one lump at the end. */
      "X-Accel-Buffering": "no",
    },
  });
}
