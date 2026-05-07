"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

export function CaseIdCopy({ caseId }: { caseId: string }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(caseId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — older browsers won't support clipboard API
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
      aria-label="Salin Case ID"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          Tersalin
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Salin
        </>
      )}
    </button>
  );
}
