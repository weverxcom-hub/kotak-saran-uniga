"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import * as React from "react";

export function OptionCard({
  selected,
  label,
  description,
  icon,
  onClick,
  className,
  size = "default",
}: {
  selected: boolean;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all",
        "hover:border-primary/60 hover:bg-primary/[0.04] hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary/[0.07] shadow-sm ring-1 ring-primary/40"
          : "border-border",
        size === "sm" ? "p-3" : "p-4",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary",
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {description}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background",
        )}
        aria-hidden
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </div>
    </button>
  );
}
