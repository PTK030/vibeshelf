"use client";

import { type ChangeEvent, type FormEvent, useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { SECTION_TRANSITION } from "@/lib/motion";

interface AskAiProps {
  /* No provider connected means the endpoint would just 400. */
  enabled: boolean;
}

const SUGGESTIONS = [
  "Czego słucham najwięcej i co to o mnie mówi?",
  "Które gatunki mam w bibliotece, ale prawie ich nie słucham?",
  "Co podobnego do moich ulubionych mógłbym sprawdzić?",
  "Czy moje playlisty się dublują?",
];

const ANSWER = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};

export function AskAi({ enabled }: AskAiProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
  }, []);

  const ask = useCallback(async (text: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setError(undefined);
    setAnswer("");

    try {
      const response = await fetch("/api/zapytaj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
        signal: controller.signal,
      });

      if (!response.ok || response.body === null) {
        const detail = (await response.json().catch(() => ({}))) as { error?: string };
        setError(detail.error ?? "Nie udało się zapytać modelu.");
        return;
      }

      /* Plain text stream: append as it arrives so the answer types itself out. */
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      /* eslint-disable no-await-in-loop -- reading a stream is sequential. */
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((current) => current + value);
      }
      /* eslint-enable no-await-in-loop */
    } catch {
      if (!controller.signal.aborted) setError("Połączenie przerwane.");
    } finally {
      setBusy(false);
    }
  }, []);

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

  return (
    <section>
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={question}
          onChange={handleChange}
          disabled={!enabled || busy}
          placeholder={
            enabled
              ? "Zapytaj o swoją muzykę — np. czego słucham za dużo?"
              : "Podłącz model w ustawieniach, żeby pytać"
          }
          aria-label="Zapytaj o swoją bibliotekę"
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
          {busy ? "Myślę..." : "Zapytaj"}
        </button>
      </form>

      {enabled && answer === "" && !busy && error === undefined && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <SuggestionChip key={suggestion} text={suggestion} onPick={useSuggestion} />
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {(answer !== "" || error !== undefined) && (
          <motion.div
            initial={ANSWER.initial}
            animate={ANSWER.animate}
            exit={ANSWER.exit}
            transition={SECTION_TRANSITION}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-4 rounded-md border p-5 text-sm whitespace-pre-wrap",
                error === undefined
                  ? "border-border bg-surface text-foreground"
                  : "border-danger/40 bg-surface text-danger",
              )}
            >
              {error ?? answer}
              {busy && <span className="ml-0.5 animate-pulse text-accent">▍</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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
