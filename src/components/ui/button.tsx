import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant = "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  accent:
    "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press hover:scale-104 active:scale-100",
  secondary:
    "border border-border-strong text-foreground hover:border-foreground hover:scale-104 active:scale-100",
  ghost: "text-muted hover:text-foreground hover:bg-surface-hover",
  danger: "bg-danger text-background hover:brightness-110 hover:scale-104 active:scale-100",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-xs",
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
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

const BASE_CLASSES = [
  "label-caps inline-flex shrink-0 items-center justify-center gap-2 rounded-pill",
  "transition-[transform,background-color,border-color,filter] duration-200 ease-out",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/* Same surface as Button, for in-app navigation. */
export function ButtonLink({
  href,
  variant = "accent",
  size = "md",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
    >
      {children}
    </Link>
  );
}
