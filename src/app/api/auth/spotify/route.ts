import { redirect } from "next/navigation";
import { writePkce } from "@/lib/auth/session";
import { buildAuthorizeUrl, createPkcePair, createState } from "@/lib/spotify/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { verifier, challenge } = createPkcePair();
  const state = createState();

  await writePkce({ verifier, state });

  redirect(buildAuthorizeUrl(challenge, state));
}
