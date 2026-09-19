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
        interactive &&
          [
            "transition-[background-color,transform,box-shadow] duration-280 ease-smooth",
            "hover:-translate-y-0.5 hover:bg-surface-hover hover:shadow-raised",
          ].join(" "),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
