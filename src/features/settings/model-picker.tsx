"use client";

import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface ModelChoice {
  id: string;
  name: string;
  isFree: boolean;
  promptPerMillion: number | undefined;
  contextLength: number | undefined;
}

interface ModelPickerProps {
  models: readonly ModelChoice[];
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

function priceLabel(model: ModelChoice): string {
  if (model.isFree) return "free";
  if (model.promptPerMillion === undefined) return "";
  /* Sub-cent prices round to 0.00, so show enough digits to be meaningful. */
  const price =
    model.promptPerMillion < 1
      ? model.promptPerMillion.toFixed(2)
      : model.promptPerMillion.toFixed(1);
  return `$${price}/1M`;
}

/*
 * OpenRouter lists several hundred models, so free ones are grouped first —
 * they are the reason someone can try this without spending anything, and they
 * are impossible to spot in an alphabetical list of 340.
 */
export function ModelPicker({ models, value, onChange }: ModelPickerProps) {
  const [query, setQuery] = useState("");

  const handleQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const { free, paid } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = models.filter(
      (model) =>
        needle === "" ||
        model.name.toLowerCase().includes(needle) ||
        model.id.toLowerCase().includes(needle),
    );

    return {
      free: matches.filter((model) => model.isFree),
      paid: matches.filter((model) => !model.isFree),
    };
  }, [models, query]);

  const selected = models.find((model) => model.id === value);
  const searchable = models.length > 12;

  return (
    <div className="mt-5">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
        Model
        {selected?.isFree === true && <Badge tone="accent">free</Badge>}
      </span>

      {searchable && (
        <input
          value={query}
          onChange={handleQuery}
          placeholder={`Filter ${models.length} models…`}
          aria-label="Filter models"
          className={cn(
            "mb-2 h-10 w-full rounded-sm bg-surface px-3 text-xs",
            "border border-border placeholder:text-disabled",
            "transition-colors duration-350 ease-smooth focus:border-accent focus:outline-none",
          )}
        />
      )}

      <select
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-sm border border-border-strong bg-surface px-3 text-sm focus:border-accent focus:outline-none"
      >
        {free.length > 0 && (
          <optgroup label={`Free (${free.length})`}>
            {free.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} — free
              </option>
            ))}
          </optgroup>
        )}

        {paid.length > 0 && (
          <optgroup label={free.length > 0 ? "Paid" : "Models"}>
            {paid.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
                {priceLabel(model) === "" ? "" : ` — ${priceLabel(model)}`}
              </option>
            ))}
          </optgroup>
        )}

        {/* Whatever is saved must stay selectable, even if filtered out. */}
        {selected === undefined && value !== "" && <option value={value}>{value}</option>}
      </select>

      {selected?.contextLength !== undefined && (
        <p className="mt-2 text-2xs text-disabled">
          {(selected.contextLength / 1000).toFixed(0)}k token context
          {selected.isFree ? " · no cost, but rate limited" : ""}
        </p>
      )}
    </div>
  );
}
