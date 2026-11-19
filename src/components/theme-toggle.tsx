"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "system", label: "Sistem", icon: Monitor },
  { value: "dark", label: "Gelap", icon: Moon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border p-0.5",
        className,
      )}
      role="radiogroup"
      aria-label="Pilihan tema"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`Tema ${opt.label}`}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
