import { streamObject } from "ai";
import { z } from "zod";
import { type AskAnswer, AskAnswerSchema, type ResolvedReference } from "@/lib/ai/ask-schema";
import { resolveModel } from "@/lib/ai/client";
import { ASK_SYSTEM, buildLibraryContext } from "@/lib/ai/library-context";
import { stripIds, stripIdsStreaming } from "@/app/api/ask/strip-ids";
import { requireSessionForApi } from "@/lib/auth/api-session";
import { SpotifyClient } from "@/lib/spotify/client";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  question: z.string().min(2).max(500),
});

const SPOTIFY_PATH = { track: "track", artist: "artist", playlist: "playlist" } as const;

export async function POST(request: Request) {
  const session = await requireSessionForApi();
  if (session === undefined) {
    return Response.json({ error: "No session" }, { status: 401 });
  }
  if (session.ai === undefined) {
    return Response.json({ error: "Connect a model in settings first." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const client = new SpotifyClient(session.accessToken);
  const context = await buildLibraryContext(client);

  const result = streamObject({
    model: resolveModel(session.ai.provider, session.ai.key, session.ai.model),
    schema: AskAnswerSchema,
    system: ASK_SYSTEM,
    prompt: `Library data:\n${context.text}\n\nQuestion: ${parsed.data.question}`,
    temperature: 0.4,
    maxOutputTokens: 900,
    abortSignal: request.signal,
  });

  /*
   * Streamed as newline-delimited JSON: the answer text fills in as it arrives,
   * and a final message carries the references and action once they can be
   * validated against the ids we actually supplied.
   */
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        let lastAnswer = "";
        let lastPartial: Partial<AskAnswer> = {};

        for await (const partial of result.partialObjectStream) {
          lastPartial = partial as Partial<AskAnswer>;
          const answer = partial.answer ?? "";
          if (answer !== lastAnswer) {
            lastAnswer = answer;
            send({ type: "answer", answer: stripIdsStreaming(answer) });
          }
        }

        /*
         * result.object rejects if the finished value misses the schema, which
         * would throw away a perfectly usable answer over, say, a ninth
         * reference. Fall back to the last partial and validate the parts we
         * care about ourselves.
         */
        const final = await result.object.catch(() => lastPartial);

        /* Drop anything the model invented; only ids we supplied can be linked. */
        const references: ResolvedReference[] = (final.references ?? [])
          .flatMap((reference) => {
            if (reference === undefined) return [];
            const { kind, id, label } = reference;
            if (kind === undefined || id === undefined) return [];
            if (!context.knownIds.has(id)) return [];

            return [
              {
                kind,
                label: label ?? id,
                url: `https://open.spotify.com/${SPOTIFY_PATH[kind]}/${id}`,
              },
            ];
          })
          .slice(0, 8);

        const action =
          final.action === undefined ? undefined : validateAction(final.action, context.playlists);

        send({
          type: "done",
          answer: stripIds(final.answer ?? lastAnswer),
          references,
          action,
        });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "The model failed to answer.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

interface ClientAction {
  kind: "organize-library" | "organize-playlist";
  label: string;
  href: string;
}

function validateAction(
  action: Partial<{ kind: string; prompt: string; label: string; playlistId: string }>,
  playlists: Map<string, string>,
): ClientAction | undefined {
  if (action.kind === undefined || action.label === undefined) return undefined;

  const prompt = encodeURIComponent(action.prompt ?? "");

  if (action.kind === "organize-playlist") {
    /* A playlist action without a real playlist is worse than no action. */
    const id = action.playlistId;
    if (id === undefined || !playlists.has(id)) return undefined;

    return {
      kind: "organize-playlist",
      label: action.label,
      href: `/organize?playlist=${encodeURIComponent(id)}&prompt=${prompt}`,
    };
  }

  return {
    kind: "organize-library",
    label: action.label,
    href: `/organize?prompt=${prompt}`,
  };
}
