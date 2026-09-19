"use client";

import { useCallback, useRef, useState } from "react";
import {
  type LibraryStats,
  LibraryStatsSchema,
  type Plan,
  PlanSchema,
} from "@/features/organize/plan";

export interface OrganizeRequest {
  taxonomyModel: string;
  classifyModel: string;
  userPrompt?: string;
  deepAnalysis: boolean;
  playlistScoring: boolean;
  maxTracks: number;
}

export interface StreamState {
  running: boolean;
  progress: number;
  label: string;
  library: LibraryStats | undefined;
  plan: Plan | undefined;
  error: string | undefined;
}

const INITIAL: StreamState = {
  running: false,
  progress: 0,
  label: "",
  library: undefined,
  plan: undefined,
  error: undefined,
};

/*
 * EventSource only speaks GET and cannot carry a body, so the stream is read
 * off a POST response by hand. The framing is still SSE, which keeps the
 * server side conventional.
 */
function* parseEvents(buffer: string): Generator<{ event: string; data: string }> {
  for (const block of buffer.split("\n\n")) {
    if (block.trim() === "") continue;

    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }

    if (dataLines.length > 0) yield { event, data: dataLines.join("\n") };
  }
}

export function useOrganizeStream() {
  const [state, setState] = useState<StreamState>(INITIAL);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((current) => ({ ...current, running: false, label: "Przerwano." }));
  }, []);

  const start = useCallback(async (request: OrganizeRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, running: true, label: "Startuję..." });

    try {
      const response = await fetch("/api/organizuj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok || response.body === null) {
        const detail = (await response.json().catch(() => ({}))) as { error?: string };
        setState((current) => ({
          ...current,
          running: false,
          error: detail.error ?? "Nie udało się uruchomić analizy.",
        }));
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      /* eslint-disable no-await-in-loop -- reading a stream is sequential. */
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += value;
        /* Keep the trailing partial block for the next read. */
        const lastBreak = buffer.lastIndexOf("\n\n");
        if (lastBreak === -1) continue;

        const complete = buffer.slice(0, lastBreak);
        buffer = buffer.slice(lastBreak + 2);

        for (const { event, data } of parseEvents(complete)) {
          applyEvent(event, data, setState);
        }
      }
      /* eslint-enable no-await-in-loop */

      setState((current) => ({ ...current, running: false }));
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((current) => ({
        ...current,
        running: false,
        error: error instanceof Error ? error.message : "Połączenie przerwane.",
      }));
    }
  }, []);

  return { state, start, cancel };
}

function applyEvent(
  event: string,
  raw: string,
  setState: React.Dispatch<React.SetStateAction<StreamState>>,
): void {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }

  if (event === "progress" || event === "phase") {
    const payload = data as { progress?: number; label?: string };
    setState((current) => ({
      ...current,
      progress: payload.progress ?? current.progress,
      label: payload.label ?? current.label,
    }));
    return;
  }

  if (event === "library") {
    const parsed = LibraryStatsSchema.safeParse(data);
    if (parsed.success) setState((current) => ({ ...current, library: parsed.data }));
    return;
  }

  if (event === "plan") {
    const parsed = PlanSchema.safeParse(data);
    if (parsed.success) {
      setState((current) => ({ ...current, plan: parsed.data, progress: 1 }));
    }
    return;
  }

  if (event === "error") {
    const payload = data as { message?: string };
    setState((current) => ({
      ...current,
      running: false,
      error: payload.message ?? "Analiza się nie powiodła.",
    }));
  }
}
