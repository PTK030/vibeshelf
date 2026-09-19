import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-elevated text-muted",
  accent: "bg-accent/15 text-accent",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge px-2 py-0.5 text-2xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
