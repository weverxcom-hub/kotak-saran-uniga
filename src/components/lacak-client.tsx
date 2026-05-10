"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PublicStatus = {
  caseId: string;
  kategori: string;
  status:
    | "Diterima"
    | "Sedang ditindaklanjuti"
    | "Selesai"
    | "Ditolak / Tidak relevan";
  catatanPublik: string;
  reportedAt: string;
  statusUpdatedAt: string;
};

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; data: PublicStatus }
  | { kind: "not_found"; message: string }
  | { kind: "error"; message: string };

/**
 * Visual styling per status. Label & description di-translate; class Tailwind
 * tetap statis (tidak terpengaruh locale).
 */
const STATUS_STYLE: Record<
  PublicStatus["status"],
  {
    Icon: React.ComponentType<{ className?: string }>;
    badge: string;
    iconWrap: string;
  }
> = {
  Diterima: {
    Icon: Clock,
    badge:
      "border-amber-300/50 bg-amber-100/60 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
    iconWrap:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  "Sedang ditindaklanjuti": {
    Icon: Loader2,
    badge: "border-primary/40 bg-primary/10 text-primary dark:bg-primary/20",
    iconWrap: "bg-primary/15 text-primary",
  },
  Selesai: {
    Icon: CheckCircle2,
    badge:
      "border-emerald-300/50 bg-emerald-100/60 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
    iconWrap:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  "Ditolak / Tidak relevan": {
    Icon: XCircle,
    badge:
      "border-rose-300/50 bg-rose-100/60 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100",
    iconWrap:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  },
};

export function LacakClient({ initialCaseId }: { initialCaseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("lacak");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [caseId, setCaseId] = React.useState(initialCaseId);
  const [state, setState] = React.useState<LookupState>({ kind: "idle" });

  const lookup = React.useCallback(
    async (rawId: string) => {
      const trimmed = rawId.trim();
      if (!trimmed) {
        setState({ kind: "error", message: t("errEmpty") });
        return;
      }
      if (!/^[A-Za-z0-9-]{4,40}$/.test(trimmed)) {
        setState({ kind: "error", message: t("errFormat") });
        return;
      }
      setState({ kind: "loading" });
      try {
        const res = await fetch(
          `/api/lacak/${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const data = (await res.json().catch(() => null)) as
          | (PublicStatus & { error?: undefined })
          | { error: string }
          | null;
        if (res.status === 404) {
          setState({
            kind: "not_found",
            message:
              (data as { error?: string } | null)?.error ??
              t("errNotFound"),
          });
          return;
        }
        if (!res.ok) {
          setState({
            kind: "error",
            message:
              (data as { error?: string } | null)?.error ??
              t("errLoadStatus", { status: res.status }),
          });
          return;
        }
        setState({ kind: "found", data: data as PublicStatus });
      } catch (err) {
        setState({
          kind: "error",
          message:
            err instanceof Error
              ? t("errCantConnect", { message: err.message })
              : tCommon("couldNotConnect"),
        });
      }
    },
    [t, tCommon],
  );

  // Auto-lookup kalau halaman dibuka dengan ?caseId=... di URL.
  React.useEffect(() => {
    if (initialCaseId) {
      void lookup(initialCaseId);
    }
    // We only want to run this on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = caseId.trim();
    // Sync ke URL supaya bisa di-share / di-bookmark.
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (trimmed) params.set("caseId", trimmed);
    else params.delete("caseId");
    router.replace(`/lacak${params.toString() ? `?${params.toString()}` : ""}`);
    void lookup(trimmed);
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <Label htmlFor="lacak-case-id" className="text-sm font-medium">
          {t("caseIdLabel")}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {t.rich("format", {
            code: (chunks) => (
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                {chunks}
              </code>
            ),
          })}
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="lacak-case-id"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="WB-20260509-A4F1"
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            maxLength={40}
            className="font-mono uppercase tracking-wider"
          />
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="sm:w-auto"
            disabled={state.kind === "loading"}
          >
            {state.kind === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("btnLoading")}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t("btn")}
              </>
            )}
          </Button>
        </div>
      </form>

      {state.kind === "error" ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.message}</span>
        </div>
      ) : null}

      {state.kind === "not_found" ? (
        <div className="rounded-lg border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{state.message}</p>
              <p className="mt-1 text-xs">{t("notFoundHelp")}</p>
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === "found" ? (
        <ResultCard data={state.data} locale={locale} />
      ) : null}
    </div>
  );
}

function ResultCard({
  data,
  locale,
}: {
  data: PublicStatus;
  locale: string;
}) {
  const t = useTranslations("lacak");
  const tStatus = useTranslations("lacak.status");
  const style = STATUS_STYLE[data.status] ?? STATUS_STYLE["Diterima"];
  const { Icon } = style;
  // tStatus.rich tidak diperlukan; akses key bersarang via flat path dengan dot.
  const label = tStatus(`${data.status}.label`);
  const description = tStatus(`${data.status}.description`);
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            style.iconWrap,
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              data.status === "Sedang ditindaklanjuti" && "animate-spin",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("statusLabel")}
          </p>
          <p className="mt-0.5 text-lg font-semibold text-foreground sm:text-xl">
            {label}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
            style.badge,
          )}
        >
          {label}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{description}</p>

      <dl className="mt-5 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("caseIdLabel")}
          </dt>
          <dd className="mt-0.5 break-all font-mono text-foreground">
            {data.caseId}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("kategoriLabel")}
          </dt>
          <dd className="mt-0.5 text-foreground">
            {data.kategori || "\u2014"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("tanggalLabel")}
          </dt>
          <dd className="mt-0.5 text-foreground">
            {formatTimestamp(data.reportedAt, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("updateLabel")}
          </dt>
          <dd className="mt-0.5 text-foreground">
            {formatTimestamp(data.statusUpdatedAt, locale)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("catatanTitle")}
        </p>
        {data.catatanPublik ? (
          <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm text-foreground">
            {data.catatanPublik}
          </p>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm italic text-muted-foreground">
            {t("catatanEmpty")}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {t.rich("privacyNote", {
          b: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
    </article>
  );
}

function formatTimestamp(value: string, locale: string): string {
  if (!value) return "\u2014";
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  // Tampilkan dalam locale aktif (id-ID atau en-US/en-GB) supaya konsisten
  // dengan UI. Tetap mempertahankan zona waktu browser pelapor.
  const bcp = locale === "en" ? "en-GB" : "id-ID";
  return new Date(t).toLocaleString(bcp, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
