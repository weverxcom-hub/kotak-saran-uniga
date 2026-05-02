export function BreakdownList({
  title,
  items,
  total,
  emptyMessage = "Belum ada data.",
}: {
  title: string;
  items: Array<[string, number]>;
  total: number;
  emptyMessage?: string;
}) {
  const sorted = [...items].sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {sorted.map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span
                    className="truncate text-foreground"
                    title={label}
                  >
                    {label}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {count} <span className="text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
