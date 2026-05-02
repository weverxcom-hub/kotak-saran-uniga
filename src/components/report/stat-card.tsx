import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "accent" | "success" | "warning";
}) {
  const accentMap: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    accent: "from-accent/15 to-accent/5 text-accent",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {icon ? (
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
            accentMap[accent],
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
