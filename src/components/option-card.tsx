"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

/**
 * Pilihan berbentuk baris dengan tanda radio di kiri. Deskripsi tampil utuh
 * (tidak dipotong) supaya orang tahu persis apa yang dipilih.
 */
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
      role="radio"
      onClick={onClick}
      aria-checked={selected}
      className={cn(
        "group flex w-full items-start gap-3 rounded-md border bg-card text-left transition-colors",
        "hover:border-primary/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected ? "border-primary bg-primary/[0.05]" : "border-border",
        size === "sm" ? "px-3 py-2.5" : "px-4 py-3",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary" : "border-input",
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 font-medium text-foreground">
          {icon ? <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
