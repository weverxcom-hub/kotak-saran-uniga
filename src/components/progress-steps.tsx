"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type Step = {
  id: number;
  title: string;
  shortTitle?: string;
};

export function ProgressSteps({
  steps,
  current,
}: {
  steps: Step[];
  current: number;
}) {
  return (
    <nav aria-label="Langkah" className="w-full">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isCompleted = step.id < current;
          const isActive = step.id === current;
          const showConnector = idx < steps.length - 1;
          return (
            <li
              key={step.id}
              className="flex flex-1 items-center"
              aria-current={isActive ? "step" : undefined}
            >
              <div className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-background transition-all",
                    isCompleted
                      ? "bg-success text-success-foreground"
                      : isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    isActive
                      ? "text-foreground"
                      : isCompleted
                        ? "text-success"
                        : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
              {showConnector ? (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1 rounded-full transition-colors sm:mx-2",
                    step.id < current
                      ? "bg-success"
                      : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
