import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant = "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  accent: [
    "bg-accent text-on-accent",
    /* Lift plus a soft pool of the accent colour underneath. */
    "hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-accent",
    "active:translate-y-0 active:bg-accent-press active:shadow-none",
  ].join(" "),
  secondary: [
    "border border-border-strong text-muted",
    "hover:border-foreground hover:bg-surface-hover hover:text-foreground",
    "hover:-translate-y-0.5 active:translate-y-0",
  ].join(" "),
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: [
    "bg-danger text-background",
    "hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0",
  ].join(" "),
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
  "transition-[transform,background-color,border-color,box-shadow,color,filter]",
  "duration-280 ease-smooth will-change-transform",
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
