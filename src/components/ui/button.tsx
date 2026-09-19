import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "accent" | "secondary" | "ghost" | "danger" | "spotify";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  /* Primary action. Our own accent — never Spotify green. */
  accent:
    "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press hover:scale-104 active:scale-100",
  secondary:
    "border border-border-strong text-foreground hover:border-foreground hover:scale-104 active:scale-100",
  ghost: "text-muted hover:text-foreground hover:bg-surface-hover",
  danger: "bg-danger text-base hover:brightness-110 hover:scale-104 active:scale-100",
  /*
   * Reserved for actions that genuinely open Spotify. Using the brand green
   * anywhere else would imply an endorsement the Developer Policy forbids.
   */
  spotify: "bg-spotify text-base hover:brightness-110 hover:scale-104 active:scale-100",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-2xs",
  md: "h-10 px-6 text-xs",
  lg: "h-12 px-8 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = "accent",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "label-caps inline-flex shrink-0 items-center justify-center gap-2 rounded-pill",
        "transition-[transform,background-color,border-color,filter] duration-200 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/*
 * The circular play affordance. 48px on mobile, 56px from sm up, mirroring the
 * proportions the pattern is recognised by.
 */
export function PlayButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full sm:size-14",
        "bg-accent text-on-accent shadow-card",
        "transition-transform duration-200 ease-out hover:scale-104 active:scale-100",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
