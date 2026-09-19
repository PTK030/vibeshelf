"use client";

import { type ChangeEvent, type FormEvent, useCallback, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { connectProvider } from "@/features/onboarding/actions";
import { PROVIDER_IDS, type ProviderId, providerMeta } from "@/lib/ai/providers";
import { cn } from "@/lib/cn";
import { SECTION_TRANSITION } from "@/lib/motion";

interface ProviderStepProps {
  connected: ProviderId | undefined;
  onNext: () => void;
  onBack: () => void;
}

const TILE = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06, ...SECTION_TRANSITION },
  }),
};

export function ProviderStep({ connected, onNext, onBack }: ProviderStepProps) {
  const [provider, setProvider] = useState<ProviderId>(connected ?? "openrouter");
  const [apiKey, setApiKey] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | undefined>(
    connected === undefined
      ? undefined
      : { ok: true, message: `${providerMeta(connected).name} is already connected.` },
  );
  const [isPending, startTransition] = useTransition();

  const meta = providerMeta(provider);

  const handleKey = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  }, []);

  /*
   * The compiler cannot prove this stays memoised because an async body calls
   * a prop after awaiting. The dependencies are complete and correct, so the
   * check is silenced here rather than restructured around it.
   */
  // eslint-disable-next-line react/preserve-manual-memoization
  const submit = useCallback(async () => {
    const result = await connectProvider(provider, apiKey);
    setFeedback(result);
    if (result.ok) onNext();
  }, [provider, apiKey, onNext]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      startTransition(submit);
    },
    [submit],
  );

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-xl font-bold">Connect AI</h1>
      <p className="mt-3 text-sm text-muted">
        You pick the model and you pay for its use. The key is stored encrypted in your own session
        — it never reaches the browser or anyone else.
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {PROVIDER_IDS.map((id, index) => (
          <ProviderTile
            key={id}
            id={id}
            index={index}
            selected={provider === id}
            onSelect={setProvider}
          />
        ))}
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-xs font-semibold text-muted">{meta.keyLabel}</span>
        <input
          type="password"
          value={apiKey}
          onChange={handleKey}
          autoComplete="off"
          spellCheck={false}
          placeholder={`${meta.keyPrefix}...`}
          className={cn(
            "h-12 w-full rounded-sm bg-surface px-4 text-sm text-foreground",
            "border border-border-strong placeholder:text-disabled",
            "transition-colors duration-350 ease-smooth focus:border-accent focus:outline-none",
          )}
        />
      </label>

      <p className="mt-2 text-xs text-muted">
        Generate a key at{" "}
        <a
          href={meta.keyUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent transition-colors duration-350 ease-smooth hover:underline"
        >
          {new URL(meta.keyUrl).hostname}
        </a>
        {meta.oauthNote === undefined ? "." : `. ${meta.oauthNote}`}
      </p>

      {feedback !== undefined && (
        <p
          role="status"
          className={cn("mt-3 text-xs", feedback.ok ? "text-accent" : "text-danger")}
        >
          {feedback.message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Checking..." : "Connect and continue"}
        </Button>
        {connected !== undefined && (
          <Button variant="secondary" size="lg" onClick={onNext}>
            Skip
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}

interface ProviderTileProps {
  id: ProviderId;
  index: number;
  selected: boolean;
  onSelect: (id: ProviderId) => void;
}

function ProviderTile({ id, index, selected, onSelect }: ProviderTileProps) {
  const meta = providerMeta(id);
  const handleClick = useCallback(() => onSelect(id), [id, onSelect]);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      custom={index}
      variants={TILE}
      initial="hidden"
      animate="visible"
      aria-pressed={selected}
      className={cn(
        "rounded-md border p-4 text-left transition-colors duration-350 ease-smooth",
        selected
          ? "border-accent bg-surface-hover"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
      )}
    >
      <span className="block text-sm font-semibold text-foreground">{meta.name}</span>
      <span className="mt-1 block text-xs text-muted">{meta.blurb}</span>
      {meta.supportsOauth && (
        <span className="mt-2 inline-block text-2xs text-accent">supports sign-in</span>
      )}
    </motion.button>
  );
}
