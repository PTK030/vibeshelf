/*
 * lyrics.ovh is free and keyless, but slow (~1s per track) and misses a lot of
 * niche material. Fetching a whole library is not viable, so callers pass a
 * small, deliberate subset.
 *
 * We never store, display or forward the lyrics themselves. What leaves this
 * module is a handful of derived signals — that keeps us clear of reproducing
 * copyrighted text and costs a fraction of the tokens sending words would.
 */

const API = "https://api.lyrics.ovh/v1";
const REQUEST_TIMEOUT_MS = 4000;

export interface LyricsSignals {
  hasLyrics: boolean;
  wordCount: number;
  /* Low ratio = highly repetitive, which tends to mean chant-like or dance. */
  uniqueWordRatio: number;
  keywords: string[];
}

/*
 * Function words carry no thematic signal. Both languages are covered because
 * a Polish user's library is usually mixed.
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "its",
  "i",
  "you",
  "he",
  "she",
  "we",
  "they",
  "me",
  "my",
  "your",
  "this",
  "that",
  "not",
  "no",
  "yes",
  "do",
  "did",
  "done",
  "so",
  "as",
  "just",
  "like",
  "all",
  "can",
  "will",
  "would",
  "up",
  "down",
  "out",
  "get",
  "got",
  "now",
  "then",
  "there",
  "here",
  "what",
  "when",
  "how",
  "why",
  "dont",
  "im",
  "aint",
  "gonna",
  "wanna",
  "oh",
  "yeah",
  "na",
  "la",
  "i",
  "w",
  "na",
  "z",
  "ze",
  "do",
  "nie",
  "tak",
  "to",
  "jest",
  "sie",
  "że",
  "się",
  "co",
  "jak",
  "ale",
  "po",
  "za",
  "od",
  "dla",
  "mnie",
  "ciebie",
  "ja",
  "ty",
  "my",
  "wy",
  "oni",
  "ten",
  "ta",
  "te",
  "tego",
  "jestem",
]);

function extractSignals(lyrics: string): LyricsSignals {
  const words = lyrics
    .toLowerCase()
    .replaceAll(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (words.length === 0) {
    return { hasLyrics: false, wordCount: 0, uniqueWordRatio: 0, keywords: [] };
  }

  const counts = new Map<string, number>();
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const keywords = [...counts.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    hasLyrics: true,
    wordCount: words.length,
    uniqueWordRatio: new Set(words).size / words.length,
    keywords,
  };
}

async function fetchOne(artist: string, title: string): Promise<LyricsSignals | undefined> {
  const url = `${API}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;

    const body = (await response.json()) as { lyrics?: unknown };
    if (typeof body.lyrics !== "string" || body.lyrics.trim() === "") return undefined;

    return extractSignals(body.lyrics);
  } catch {
    /* Timeout, 404 or malformed body all mean "no signal", never a failure. */
    return undefined;
  }
}

export interface LyricsRequest {
  trackId: string;
  artist: string;
  title: string;
}

/*
 * Bounded on purpose. At roughly a second per lookup, anything beyond a few
 * dozen tracks would dominate the run, so callers pick the tracks that matter
 * (for example the ones a playlist hinges on) rather than the whole library.
 */
export async function fetchLyricsSignals(
  requests: readonly LyricsRequest[],
  options: { maxTracks?: number; concurrency?: number } = {},
): Promise<Map<string, LyricsSignals>> {
  const maxTracks = options.maxTracks ?? 60;
  const concurrency = options.concurrency ?? 3;

  const queue = requests.slice(0, maxTracks);
  const results = new Map<string, LyricsSignals>();
  let cursor = 0;

  async function worker(): Promise<void> {
    /* eslint-disable no-await-in-loop -- one worker drains items in order. */
    for (;;) {
      const index = cursor;
      cursor += 1;
      const request = queue[index];
      if (request === undefined) return;

      const signals = await fetchOne(request.artist, request.title);
      if (signals !== undefined) results.set(request.trackId, signals);
    }
    /* eslint-enable no-await-in-loop */
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}

export { extractSignals as extractLyricsSignalsForTest };
