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
  // Angka besar + label; garis kiri berwarna sebagai satu-satunya aksen.
  const accentMap: Record<string, string> = {
    primary: "border-l-primary",
    accent: "border-l-accent",
    success: "border-l-success",
    warning: "border-l-amber-600",
  };
  void icon;
  return (
    <div className={cn("rounded-md border border-border border-l-4 bg-card px-4 py-3", accentMap[accent])}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-serif text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
