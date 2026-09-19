"use client";

import { type ChangeEvent, type FormEvent, useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { connectProvider, disconnectProvider, updateModel } from "@/features/onboarding/actions";
import { PROVIDER_IDS, type ProviderId, providerMeta } from "@/lib/ai/providers";
import { cn } from "@/lib/cn";

interface ProviderSectionProps {
  connected: ProviderId | undefined;
  model: string | undefined;
}

export function ProviderSection({ connected, model }: ProviderSectionProps) {
  const [provider, setProvider] = useState<ProviderId>(connected ?? "openrouter");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(model ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const meta = providerMeta(provider);
  const isActiveProvider = provider === connected;

  const handleKey = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  }, []);

  // eslint-disable-next-line react/preserve-manual-memoization
  const saveModel = useCallback(async (next: string) => {
    setFeedback(await updateModel(next));
  }, []);

  const handleModel = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value;
      setSelectedModel(next);
      startTransition(() => saveModel(next));
    },
    [saveModel],
  );

  // eslint-disable-next-line react/preserve-manual-memoization
  const submit = useCallback(async () => {
    const result = await connectProvider(provider, apiKey, selectedModel || undefined);
    setFeedback(result);
    /* Never keep the key in component state once it is stored server-side. */
    if (result.ok) setApiKey("");
  }, [provider, apiKey, selectedModel]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      startTransition(submit);
    },
    [submit],
  );

  // eslint-disable-next-line react/preserve-manual-memoization
  const runDisconnect = useCallback(async () => {
    await disconnectProvider();
    setFeedback({
      ok: true,
      message: "Disconnected. Analysis is unavailable until you connect one.",
    });
  }, []);

  const handleDisconnect = useCallback(() => startTransition(runDisconnect), [runDisconnect]);

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold">AI provider</h2>
      <p className="mb-4 text-xs text-muted">
        {connected === undefined
          ? "Nothing is connected."
          : `Connected: ${providerMeta(connected).name}.`}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-2 sm:grid-cols-3">
          {PROVIDER_IDS.map((id) => (
            <ProviderOption
              key={id}
              id={id}
              selected={provider === id}
              active={connected === id}
              onSelect={setProvider}
            />
          ))}
        </div>

        {isActiveProvider && connected !== undefined && (
          <ModelPicker models={meta.models} value={selectedModel} onChange={handleModel} />
        )}

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-semibold text-muted">
            {isActiveProvider ? `Replace ${meta.keyLabel.toLowerCase()}` : meta.keyLabel}
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={handleKey}
            autoComplete="off"
            spellCheck={false}
            placeholder={`${meta.keyPrefix}...`}
            className={cn(
              "h-12 w-full rounded-sm bg-surface px-4 text-sm",
              "border border-border-strong placeholder:text-disabled",
              "transition-colors duration-350 ease-smooth focus:border-accent focus:outline-none",
            )}
          />
        </label>

        {meta.oauthNote !== undefined && (
          <p className="mt-2 text-xs text-muted">{meta.oauthNote}</p>
        )}

        {feedback !== undefined && (
          <p
            role="status"
            className={cn("mt-3 text-xs", feedback.ok ? "text-accent" : "text-danger")}
          >
            {feedback.message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" disabled={isPending || apiKey.trim() === ""}>
            {isPending ? "Checking..." : "Save key"}
          </Button>
          {connected !== undefined && (
            <Button variant="ghost" onClick={handleDisconnect} disabled={isPending}>
              Disconnect
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

interface ModelPickerProps {
  models: ReadonlyArray<{ id: string; name: string; hint: string }>;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

function ModelPicker({ models, value, onChange }: ModelPickerProps) {
  const known = models.some((model) => model.id === value);

  return (
    <label className="mt-5 block">
      <span className="mb-2 block text-xs font-semibold text-muted">Model</span>
      <select
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm focus:border-accent focus:outline-none"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} — {model.hint}
          </option>
        ))}
        {/* An OpenRouter id chosen on the organise screen may not be in this list. */}
        {!known && value !== "" && <option value={value}>{value}</option>}
      </select>
    </label>
  );
}

interface ProviderOptionProps {
  id: ProviderId;
  selected: boolean;
  active: boolean;
  onSelect: (id: ProviderId) => void;
}

function ProviderOption({ id, selected, active, onSelect }: ProviderOptionProps) {
  const meta = providerMeta(id);
  const handleClick = useCallback(() => onSelect(id), [id, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      className={cn(
        "rounded-md border p-4 text-left transition-colors duration-350 ease-smooth",
        selected
          ? "border-accent bg-surface-hover"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{meta.name}</span>
        {active && <span className="text-2xs text-accent">active</span>}
      </span>
      <span className="mt-1 block text-xs text-muted">{meta.blurb}</span>
    </button>
  );
}
