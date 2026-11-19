"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Toggle bahasa sederhana: dua pill (ID / EN). Saat di-klik, kirim
 * POST ke /api/locale untuk set cookie `ksu_locale`, lalu reload
 * halaman supaya semua React Server Component (form, label, dst.)
 * di-render ulang dengan locale baru. Tidak ada URL prefix —
 * link `/saran`, `/whistleblower`, `/lacak` tetap sama.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const active = useLocale();
  const [pending, setPending] = React.useState<string | null>(null);

  const switchTo = React.useCallback(
    async (locale: "id" | "en") => {
      if (pending || locale === active) return;
      setPending(locale);
      try {
        const res = await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        if (!res.ok) {
          setPending(null);
          return;
        }
        // Reload supaya server-side messages ikut ganti.
        window.location.reload();
      } catch {
        setPending(null);
      }
    },
    [active, pending],
  );

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border p-0.5 text-xs font-semibold",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => void switchTo("id")}
        aria-pressed={active === "id"}
        aria-label={t("switchToId")}
        disabled={pending !== null}
        className={cn(
          "rounded-sm px-2 py-1 transition-colors",
          active === "id"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          pending && "opacity-60",
        )}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => void switchTo("en")}
        aria-pressed={active === "en"}
        aria-label={t("switchToEn")}
        disabled={pending !== null}
        className={cn(
          "rounded-sm px-2 py-1 transition-colors",
          active === "en"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          pending && "opacity-60",
        )}
      >
        EN
      </button>
    </div>
  );
}
