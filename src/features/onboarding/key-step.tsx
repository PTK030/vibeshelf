"use client";

import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveOpenrouterKey } from "@/features/onboarding/actions";
import { cn } from "@/lib/cn";

interface KeyStepProps {
  hasKey: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function KeyStep({ hasKey, onNext, onBack }: KeyStepProps) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | undefined>(
    hasKey ? { ok: true, message: "Klucz jest już zapisany." } : undefined,
  );
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      startTransition(async () => {
        const result = await saveOpenrouterKey(value);
        setFeedback(result);
        if (result.ok) onNext();
      });
    },
    [value, onNext],
  );

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-xl font-bold">Podłącz OpenRouter</h1>
      <p className="mt-3 text-sm text-muted">
        Model wybierasz Ty i Ty płacisz za jego użycie. Klucz trzymamy zaszyfrowany w Twojej sesji —
        nie trafia do przeglądarki ani do nikogo innego.
      </p>

      <label className="mt-8 block">
        <span className="mb-2 block text-xs font-semibold text-muted">Klucz API</span>
        <input
          type="password"
          value={value}
          onChange={handleChange}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-v1-..."
          className={cn(
            "h-12 w-full rounded-sm bg-surface px-4 text-sm text-foreground",
            "border border-border-strong placeholder:text-disabled",
            "transition-colors duration-150 focus:border-accent focus:outline-none",
          )}
        />
      </label>

      {feedback !== undefined && (
        <p
          role="status"
          className={cn("mt-3 text-xs", feedback.ok ? "text-accent" : "text-danger")}
        >
          {feedback.message}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">Klucz wygenerujesz na openrouter.ai w sekcji Keys.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sprawdzam..." : "Zapisz i dalej"}
        </Button>
        {hasKey && (
          <Button variant="secondary" size="lg" onClick={onNext}>
            Pomiń
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={onBack}>
          Wstecz
        </Button>
      </div>
    </form>
  );
}
