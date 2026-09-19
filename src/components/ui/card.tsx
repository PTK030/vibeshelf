import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /* Cards that are not clickable should not animate on hover. */
  interactive?: boolean;
  children: ReactNode;
}

export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-surface p-4",
        interactive && "transition-colors duration-200 hover:bg-surface-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
