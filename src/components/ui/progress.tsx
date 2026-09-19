import { cn } from "@/lib/cn";

interface ProgressProps {
  /* 0..1 */
  value: number;
  label: string;
  className?: string;
}

export function Progress({ value, label, className }: ProgressProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-foreground">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1 w-full overflow-hidden rounded-pill bg-elevated"
      >
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-200 ease-out"
          /* A dynamic width cannot be a static class, and this is a server
             component, so the object identity has no re-render to affect. */
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
