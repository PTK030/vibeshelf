"use client";

import { type ChangeEvent, useCallback } from "react";
import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked),
    [onChange],
  );

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-md p-4",
        "bg-surface transition-colors duration-150 hover:bg-surface-hover",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description !== undefined && (
          <span className="mt-1 block text-xs text-muted">{description}</span>
        )}
      </span>

      <span className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "block h-6 w-11 rounded-pill transition-colors duration-200",
            "peer-focus-visible:outline peer-focus-visible:outline-2",
            "peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            checked ? "bg-accent" : "bg-border-strong",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 left-1 size-4 rounded-full bg-background transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </span>
    </label>
  );
}
