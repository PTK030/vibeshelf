"use client";

import { type ChangeEvent, type FormEvent, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { SpotifyMark } from "@/components/spotify/spotify-mark";
import type { ResolvedReference } from "@/lib/ai/ask-schema";
import { cn } from "@/lib/cn";
import { SECTION_TRANSITION } from "@/lib/motion";

interface AskAiProps {
  /* No provider connected means the endpoint would just 400. */
  enabled: boolean;
}

interface Action {
  kind: "organize-library" | "organize-playlist";
  label: string;
  href: string;
}

const SUGGESTIONS = [
  "What did I listen to today?",
  "Which genres sit in my library but barely get played?",
  "Sort my liked songs into playlists",
  "Do my playlists overlap?",
];

const PANEL = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};

export function AskAi({ enabled }: AskAiProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [references, setReferences] = useState<ResolvedReference[]>([]);
  const [action, setAction] = useState<Action | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
  }, []);

  /*
   * Mid-stream text may only get longer. Partial JSON parsing can briefly
   * yield a shorter string, and rendering that reads as the answer erasing
   * itself. The final message is applied with setAnswer and may shorten.
   */
  const growAnswer = useCallback((next: string) => {
    setAnswer((current) => (next.length >= current.length ? next : current));
  }, []);

  const ask = useCallback(
    async (text: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBusy(true);
      setError(undefined);
      setAnswer("");
      setReferences([]);
      setAction(undefined);

      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
          signal: controller.signal,
        });

        if (!response.ok || response.body === null) {
          const detail = (await response.json().catch(() => ({}))) as { error?: string };
          setError(detail.error ?? "Could not reach the model.");
          return;
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";

        /* eslint-disable no-await-in-loop -- reading a stream is sequential. */
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += value;
          const lines = buffer.split("\n");
          /* The last piece may be a partial line; keep it for the next read. */
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            applyMessage(line, { growAnswer, setAnswer, setReferences, setAction, setError });
          }
        }
        /* eslint-enable no-await-in-loop */

        /*
         * A final message without a trailing newline would otherwise sit in the
         * buffer unread — and that last message is the one carrying the links
         * and the action.
         */
        if (buffer.trim() !== "") {
          applyMessage(buffer, { growAnswer, setAnswer, setReferences, setAction, setError });
        }
      } catch {
        if (!controller.signal.aborted) setError("Connection interrupted.");
      } finally {
        setBusy(false);
      }
    },
    [growAnswer],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (question.trim().length < 2) return;
      void ask(question.trim());
    },
    [question, ask],
  );

  const useSuggestion = useCallback(
    (text: string) => {
      setQuestion(text);
      void ask(text);
    },
    [ask],
  );

  const hasOutput = answer !== "" || error !== undefined;

  return (
    <section>
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={question}
          onChange={handleChange}
          disabled={!enabled || busy}
          placeholder={
            enabled
              ? "Ask about your music, or tell it what to sort"
              : "Connect a model in settings to ask questions"
          }
          aria-label="Ask about your library"
          className={cn(
            "h-14 w-full rounded-pill bg-surface pr-32 pl-6 text-sm text-foreground",
            "border border-border placeholder:text-disabled",
            "transition-colors duration-350 ease-smooth",
            "hover:border-border-strong focus:border-accent focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
        <button
          type="submit"
          disabled={!enabled || busy || question.trim().length < 2}
          className={cn(
            "label-caps absolute top-2 right-2 h-10 rounded-pill px-5 text-2xs",
            "bg-accent text-on-accent transition-all duration-350 ease-smooth",
            "hover:brightness-105 disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          {busy ? "Thinking..." : "Ask"}
        </button>
      </form>

      {enabled && !hasOutput && !busy && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <SuggestionChip key={suggestion} text={suggestion} onPick={useSuggestion} />
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {hasOutput && (
          <motion.div
            initial={PANEL.initial}
            animate={PANEL.animate}
            exit={PANEL.exit}
            transition={SECTION_TRANSITION}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-4 rounded-md border p-5",
                error === undefined ? "border-border bg-surface" : "border-danger/40 bg-surface",
              )}
            >
              <p
                className={cn(
                  "text-sm whitespace-pre-wrap",
                  error === undefined ? "text-foreground" : "text-danger",
                )}
              >
                {error ?? answer}
                {busy && (
                  /*
                   * A drawn block, not the ▍ glyph, whose baseline placement
                   * varies by font. align-text-bottom pins its foot to the
                   * bottom of the text box, which is where a caret belongs —
                   * translating it by hand only looked right at one font size.
                   */
                  <span
                    aria-hidden="true"
                    className="ml-1 inline-block h-[1.1em] w-[2px] animate-pulse rounded-[1px] bg-accent align-text-bottom"
                  />
                )}
              </p>

              {references.length > 0 && <ReferenceList references={references} />}
              {action !== undefined && <ActionButton action={action} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

interface Setters {
  /* Partial updates go through a reducer so text can only grow. */
  growAnswer: (value: string) => void;
  setAnswer: (value: string) => void;
  setReferences: (value: ResolvedReference[]) => void;
  setAction: (value: Action | undefined) => void;
  setError: (value: string) => void;
}

function applyMessage(line: string, setters: Setters): void {
  let message: unknown;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  const payload = message as {
    type?: string;
    answer?: string;
    references?: ResolvedReference[];
    action?: Action;
    message?: string;
  };

  if (payload.type === "answer" && payload.answer !== undefined) {
    setters.growAnswer(payload.answer);
    return;
  }

  if (payload.type === "done") {
    if (payload.answer !== undefined) setters.setAnswer(payload.answer);
    setters.setReferences(payload.references ?? []);
    setters.setAction(payload.action);
    return;
  }

  if (payload.type === "error") {
    setters.setError(payload.message ?? "The model failed to answer.");
  }
}

function ReferenceList({ references }: { references: ResolvedReference[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
      {references.map((reference) => (
        <a
          key={`${reference.kind}-${reference.url}`}
          href={reference.url}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "inline-flex items-center gap-2 rounded-pill bg-elevated py-1.5 pr-3 pl-2.5",
            "text-2xs text-muted transition-colors duration-350 ease-smooth",
            "hover:bg-surface-hover hover:text-foreground",
          )}
        >
          <SpotifyMark className="size-3.5" />
          {reference.label}
        </a>
      ))}
    </div>
  );
}

/*
 * The whole point of the action: "sort playlist X" becomes a button that opens
 * the analysis with the brief already written, instead of instructions the
 * user has to follow themselves.
 */
function ActionButton({ action }: { action: Action }) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <Link
        href={action.href}
        className={cn(
          "label-caps inline-flex h-10 items-center rounded-pill px-5 text-2xs",
          "bg-accent text-on-accent transition-all duration-350 ease-smooth",
          "hover:-translate-y-px hover:brightness-105 active:translate-y-0",
        )}
      >
        {action.label}
      </Link>
    </div>
  );
}

interface SuggestionChipProps {
  text: string;
  onPick: (text: string) => void;
}

function SuggestionChip({ text, onPick }: SuggestionChipProps) {
  const handleClick = useCallback(() => onPick(text), [text, onPick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "rounded-pill border border-border bg-surface px-4 py-2 text-2xs text-muted",
        "transition-colors duration-350 ease-smooth",
        "hover:border-border-strong hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {text}
    </button>
  );
}
