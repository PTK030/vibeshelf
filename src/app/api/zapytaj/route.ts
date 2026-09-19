import { streamText } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/ai/client";
import { ASK_SYSTEM, buildLibraryContext } from "@/lib/ai/library-context";
import { requireSessionForApi } from "@/lib/auth/api-session";
import { SpotifyClient } from "@/lib/spotify/client";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  question: z.string().min(2).max(500),
});

export async function POST(request: Request) {
  const session = await requireSessionForApi();
  if (session === undefined) {
    return Response.json({ error: "Brak sesji" }, { status: 401 });
  }
  if (session.ai === undefined) {
    return Response.json({ error: "Najpierw podłącz model w ustawieniach." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Zadaj pytanie." }, { status: 400 });
  }

  const client = new SpotifyClient(session.accessToken);
  const context = await buildLibraryContext(client);

  const result = streamText({
    model: resolveModel(session.ai.provider, session.ai.key, session.ai.model),
    system: ASK_SYSTEM,
    prompt: `Dane o bibliotece:\n${context}\n\nPytanie: ${parsed.data.question}`,
    temperature: 0.4,
    maxOutputTokens: 700,
    abortSignal: request.signal,
  });

  /* Plain text stream — the client renders it as it arrives. */
  return result.toTextStreamResponse();
}
