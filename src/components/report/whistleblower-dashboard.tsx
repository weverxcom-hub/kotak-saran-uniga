"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  EyeOff,
  ShieldCheck,
  X,
  XCircle,
  ShieldAlert,
  Calendar,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/report/stat-card";
import { BreakdownList } from "@/components/report/breakdown-list";
import {
  WHISTLEBLOWER_CATEGORIES,
  WHISTLEBLOWER_STATUSES,
} from "@/lib/whistleblower-config";
import type { WhistleblowerStatus } from "@/lib/whistleblower-config";
import type { WhistleblowerRow, WhistleblowerStats } from "@/lib/sheets";
import { cn } from "@/lib/utils";

const LOCALE_TAG: Record<string, string> = { id: "id-ID", en: "en-US" };

type UnitGroup = {
  fakultas: string;
  hasFacultyLevel: boolean;
  prodi: string[];
};

function flattenUnitOptions(groups: UnitGroup[]): string[] {
  const out: string[] = [];
  for (const g of groups) {
    if (g.hasFacultyLevel) out.push(g.fakultas);
    for (const p of g.prodi) out.push(`${g.fakultas} — ${p}`);
  }
  return out;
}

type Filters = {
  q: string;
  kategori: string;
  unit: string;
  mode: "all" | "Ya" | "Tidak";
  status: "all" | WhistleblowerStatus;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: Filters = {
  q: "",
  kategori: "all",
  unit: "all",
  mode: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

type StatusVisual = {
  badge: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const STATUS_VISUAL: Record<WhistleblowerStatus, StatusVisual> = {
  Diterima: {
    badge:
      "border border-amber-300/50 bg-amber-100/70 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
    Icon: Clock,
  },
  "Sedang ditindaklanjuti": {
    badge:
      "border border-primary/40 bg-primary/10 text-primary dark:bg-primary/20",
    Icon: Loader2,
  },
  Selesai: {
    badge:
      "border border-emerald-300/50 bg-emerald-100/70 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
    Icon: CheckCircle2,
  },
  "Ditolak / Tidak relevan": {
    badge:
      "border border-rose-300/50 bg-rose-100/70 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100",
    Icon: XCircle,
  },
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      rows: WhistleblowerRow[];
      total: number;
      totalAll: number;
      stats: WhistleblowerStats;
    };

function buildQuery(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.kategori !== "all") sp.set("kategori", f.kategori);
  if (f.unit !== "all") sp.set("unit", f.unit);
  if (f.mode !== "all") sp.set("mode", f.mode);
  if (f.status !== "all") sp.set("status", f.status);
  if (f.dateFrom) sp.set("dateFrom", f.dateFrom);
  if (f.dateTo) sp.set("dateTo", f.dateTo);
  return sp.toString();
}

function formatDateTime(iso: string, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function formatMonth(month: string, locale: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "id-ID", {
    year: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function WhistleblowerDashboard() {
  const t = useTranslations("adminReport");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("wbStatus");
  const tLacak = useTranslations("lacak");
  const locale = useLocale();
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [pendingQ, setPendingQ] = React.useState("");
  const [load, setLoad] = React.useState<LoadState>({ kind: "idle" });
  const [openRow, setOpenRow] = React.useState<string | null>(null);
  const [unitOptions, setUnitOptions] = React.useState<string[]>([]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/units", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { groups?: UnitGroup[] };
        if (!alive) return;
        setUnitOptions(flattenUnitOptions(data.groups ?? []));
      } catch {
        // diam saja — filter unit tetap menampilkan "Semua".
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === pendingQ ? f : { ...f, q: pendingQ }));
    }, 350);
    return () => clearTimeout(t);
  }, [pendingQ]);

  const fetchData = React.useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const qs = buildQuery(filters);
      const res = await fetch(
        `/api/report/whistleblower/list${qs ? `?${qs}` : ""}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setLoad({
          kind: "error",
          message: data?.error ?? t("errLoadData", { status: res.status }),
        });
        return;
      }
      const data = (await res.json()) as {
        rows: WhistleblowerRow[];
        total: number;
        totalAll: number;
        stats: WhistleblowerStats;
      };
      setLoad({
        kind: "ready",
        rows: data.rows,
        total: data.total,
        totalAll: data.totalAll,
        stats: data.stats,
      });
    } catch (err) {
      setLoad({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : tCommon("couldNotConnect"),
      });
    }
  }, [filters, t, tCommon]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onExportCSV = () => {
    const qs = buildQuery(filters);
    window.location.href = `/api/report/whistleblower/export${qs ? `?${qs}` : ""}`;
  };

  const onResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPendingQ("");
  };

  const hasActiveFilters =
    filters.q !== "" ||
    filters.kategori !== "all" ||
    filters.unit !== "all" ||
    filters.mode !== "all" ||
    filters.status !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  // Setelah update status sukses, perbarui state lokal supaya tidak
  // perlu refetch seluruh list (UX lebih cepat).
  const applyRowUpdate = React.useCallback(
    (
      rowIndex: number,
      patch: {
        status: WhistleblowerStatus;
        catatanPublik: string;
        statusUpdatedAt: string;
      },
    ) => {
      setLoad((s) => {
        if (s.kind !== "ready") return s;
        return {
          ...s,
          rows: s.rows.map((r) =>
            r.rowIndex === rowIndex ? { ...r, ...patch } : r,
          ),
        };
      });
    },
    [],
  );

  const localeNumber = LOCALE_TAG[locale] ?? "id-ID";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalLaporan")}
          value={
            load.kind === "ready"
              ? load.stats.total.toLocaleString(localeNumber)
              : "—"
          }
          hint={
            load.kind === "ready" && load.total !== load.totalAll
              ? t("fromTotal", {
                  total: load.totalAll.toLocaleString(localeNumber),
                })
              : undefined
          }
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="primary"
        />
        <StatCard
          label={t("denganIdentitas")}
          value={
            load.kind === "ready"
              ? load.stats.identitas.toLocaleString(localeNumber)
              : "—"
          }
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label={t("anonim")}
          value={
            load.kind === "ready"
              ? load.stats.anonim.toLocaleString(localeNumber)
              : "—"
          }
          icon={<EyeOff className="h-5 w-5" />}
          accent="accent"
        />
        <StatCard
          label={t("bulanAktif")}
          value={
            load.kind === "ready"
              ? load.stats.perMonth.length.toLocaleString(localeNumber)
              : "—"
          }
          hint={
            load.kind === "ready" && load.stats.perMonth.length > 0
              ? `${formatMonth(load.stats.perMonth[0].month, locale)} – ${formatMonth(
                  load.stats.perMonth[load.stats.perMonth.length - 1].month,
                  locale,
                )}`
              : undefined
          }
          icon={<Calendar className="h-5 w-5" />}
          accent="warning"
        />
      </section>

      {/* Breakdown */}
      {load.kind === "ready" && load.stats.total > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <BreakdownList
            title={t("perKategori")}
            items={Object.entries(load.stats.perKategori)}
            total={load.stats.total}
          />
          <BreakdownList
            title={t("perUnit")}
            items={Object.entries(load.stats.perUnit)}
            total={load.stats.total}
          />
        </section>
      ) : null}

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-rose-600" />
          {t("filterTitle")}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {t("resetFilter")}
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Label htmlFor="wb-q" className="mb-1.5 block text-xs">
              {t("search")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="wb-q"
                value={pendingQ}
                onChange={(e) => setPendingQ(e.target.value)}
                placeholder={t("searchPlaceholderWb")}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="wb-kat" className="mb-1.5 block text-xs">
              {t("kategori")}
            </Label>
            <Select
              id="wb-kat"
              value={filters.kategori}
              onChange={(e) =>
                setFilters((f) => ({ ...f, kategori: e.target.value }))
              }
            >
              <option value="all">{tCommon("all")}</option>
              {WHISTLEBLOWER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="wb-unit" className="mb-1.5 block text-xs">
              {t("unit")}
            </Label>
            <Select
              id="wb-unit"
              value={filters.unit}
              onChange={(e) =>
                setFilters((f) => ({ ...f, unit: e.target.value }))
              }
            >
              <option value="all">{tCommon("all")}</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="wb-mode" className="mb-1.5 block text-xs">
              {t("mode")}
            </Label>
            <Select
              id="wb-mode"
              value={filters.mode}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  mode: e.target.value as Filters["mode"],
                }))
              }
            >
              <option value="all">{tCommon("all")}</option>
              <option value="Ya">{tCommon("anonim")}</option>
              <option value="Tidak">{tCommon("identitas")}</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="wb-status" className="mb-1.5 block text-xs">
              {t("status")}
            </Label>
            <Select
              id="wb-status"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as Filters["status"],
                }))
              }
            >
              <option value="all">{tCommon("all")}</option>
              {WHISTLEBLOWER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="wb-dfrom" className="mb-1.5 block text-xs">
              {t("dateFrom")}
            </Label>
            <Input
              id="wb-dfrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="wb-dto" className="mb-1.5 block text-xs">
              {t("dateTo")}
            </Label>
            <Input
              id="wb-dto"
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            disabled={load.kind === "loading"}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                load.kind === "loading" && "animate-spin",
              )}
            />
            {t("reload")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            disabled={load.kind !== "ready" || load.rows.length === 0}
          >
            <Download className="h-4 w-4" />
            {t("exportCsv")}
          </Button>
        </div>
      </section>

      {/* Results */}
      <section>
        {load.kind === "loading" ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : load.kind === "error" ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{load.message}</span>
          </div>
        ) : load.kind === "ready" && load.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {load.totalAll === 0
                ? t("noReportsAll")
                : t("noReportsFilter")}
            </p>
            {load.totalAll === 0 ? (
              <p className="max-w-md text-xs text-muted-foreground">
                {t("wbHint")}
              </p>
            ) : null}
          </div>
        ) : load.kind === "ready" ? (
          <div className="space-y-3">
            {load.rows.map((r) => {
              const id = `${r.rowIndex}-${r.caseId}`;
              const isOpen = openRow === id;
              const isAnon = /ya|anonim/i.test(r.isAnonim);
              const statusKey: WhistleblowerStatus =
                (WHISTLEBLOWER_STATUSES as readonly string[]).includes(
                  r.status,
                )
                  ? (r.status as WhistleblowerStatus)
                  : "Diterima";
              const statusVisual = STATUS_VISUAL[statusKey];
              const StatusIcon = statusVisual.Icon;
              return (
                <div
                  key={id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenRow(isOpen ? null : id)}
                    className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-muted/40"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                          {r.caseId}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                            statusVisual.badge,
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              "h-3 w-3",
                              r.status === "Sedang ditindaklanjuti" &&
                                "animate-spin",
                            )}
                          />
                          {tStatus(statusKey)}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {r.kategori || "—"}
                        </span>
                        {isAnon ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-500/20 dark:text-slate-200">
                            <EyeOff className="h-3 w-3" />
                            {tCommon("anonim")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                            <ShieldCheck className="h-3 w-3" />
                            {r.nama || tCommon("identitas")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {r.detail || "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDateTime(r.timestamp, locale)}</span>
                        <span>·</span>
                        <span>{r.saudaraAdalah || "—"}</span>
                        <span>·</span>
                        <span>{r.unitKerja || "—"}</span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen ? (
                    <div className="border-t border-border bg-background/40 p-4 text-sm">
                      <StatusEditor row={r} onUpdated={applyRowUpdate} />
                      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Field label={t("dCaseId")} value={r.caseId} />
                        <Field
                          label={tLacak("tanggalLabel")}
                          value={formatDateTime(r.timestamp, locale)}
                        />
                        <Field label={t("dKategori")} value={r.kategori} />
                        <Field
                          label={t("dPihak")}
                          value={r.pihakTerlibat || "—"}
                        />
                        <Field label={t("dPeran")} value={r.saudaraAdalah || "—"} />
                        <Field label={t("dUnit")} value={r.unitKerja || "—"} />
                        {!isAnon ? (
                          <>
                            <Field label={t("dNama")} value={r.nama || "—"} />
                            <Field label={t("dNim")} value={r.nim || "—"} />
                            <Field
                              label={t("dKontak")}
                              value={r.kontak || "—"}
                              span
                            />
                          </>
                        ) : null}
                        <Field
                          label={t("dDetail")}
                          value={r.detail || "—"}
                          span
                          multiline
                        />
                        <Field
                          label={t("dKronologi")}
                          value={r.kronologi || "—"}
                          span
                          multiline
                        />
                      </dl>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground">
              {t("showing", {
                from: 1,
                to: load.rows.length.toLocaleString(localeNumber),
                total: load.totalAll.toLocaleString(localeNumber),
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  span,
  multiline,
}: {
  label: string;
  value: string;
  span?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={cn(span && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-foreground",
          multiline && "whitespace-pre-wrap",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

/**
 * Inline editor untuk Status & Catatan Publik. Hanya muncul saat baris
 * di-expand. Submit akan memanggil PATCH /api/admin/whistleblower/[rowIndex]
 * dan, kalau sukses, men-update state lokal lewat `onUpdated` supaya UI
 * langsung sync tanpa harus refetch seluruh list.
 */
function StatusEditor({
  row,
  onUpdated,
}: {
  row: WhistleblowerRow;
  onUpdated: (
    rowIndex: number,
    patch: {
      status: WhistleblowerStatus;
      catatanPublik: string;
      statusUpdatedAt: string;
    },
  ) => void;
}) {
  const t = useTranslations("adminReport");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("wbStatus");
  const locale = useLocale();
  const [status, setStatus] = React.useState<WhistleblowerStatus>(row.status);
  const [catatan, setCatatan] = React.useState(row.catatanPublik);
  const [save, setSave] = React.useState<SaveState>({ kind: "idle" });

  // Sync state lokal kalau row berubah dari luar (mis. setelah refetch).
  React.useEffect(() => {
    setStatus(row.status);
    setCatatan(row.catatanPublik);
    setSave({ kind: "idle" });
  }, [row.rowIndex, row.status, row.catatanPublik]);

  const dirty = status !== row.status || catatan !== row.catatanPublik;

  const onSave = async () => {
    setSave({ kind: "saving" });
    try {
      const res = await fetch(
        `/api/admin/whistleblower/${row.rowIndex}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, catatanPublik: catatan }),
        },
      );
      const data = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            status?: WhistleblowerStatus;
            catatanPublik?: string;
            statusUpdatedAt?: string;
          }
        | null;
      if (!res.ok || !data?.ok) {
        setSave({
          kind: "error",
          message: data?.error ?? t("errSaveStatus", { status: res.status }),
        });
        return;
      }
      onUpdated(row.rowIndex, {
        status: data.status ?? status,
        catatanPublik: data.catatanPublik ?? catatan,
        statusUpdatedAt: data.statusUpdatedAt ?? new Date().toISOString(),
      });
      setSave({ kind: "saved", at: Date.now() });
    } catch (err) {
      setSave({
        kind: "error",
        message:
          err instanceof Error
            ? `${tCommon("couldNotConnect")}: ${err.message}`
            : tCommon("couldNotConnect"),
      });
    }
  };

  return (
    <section
      aria-label={t("statusEditTitle")}
      className="rounded-xl border border-border bg-background p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("statusEditTitle")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("dUpdate")}: {formatDateTime(row.statusUpdatedAt, locale) || "—"}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div>
          <Label
            htmlFor={`wb-status-edit-${row.rowIndex}`}
            className="mb-1.5 block text-xs"
          >
            {t("status")}
          </Label>
          <Select
            id={`wb-status-edit-${row.rowIndex}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as WhistleblowerStatus)}
            disabled={save.kind === "saving"}
          >
            {WHISTLEBLOWER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tStatus(s)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label
            htmlFor={`wb-catatan-edit-${row.rowIndex}`}
            className="mb-1.5 block text-xs"
          >
            {t("publicNote")}{" "}
            <span className="font-normal text-muted-foreground">
              {t("publicNoteHint")}
            </span>
          </Label>
          <Textarea
            id={`wb-catatan-edit-${row.rowIndex}`}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={t("publicNotePlaceholder")}
            rows={3}
            maxLength={2000}
            disabled={save.kind === "saving"}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("charsOf", { count: catatan.length, max: 2000 })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="gradient"
          size="sm"
          onClick={() => void onSave()}
          disabled={!dirty || save.kind === "saving"}
        >
          {save.kind === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t("saveStatus")}
            </>
          )}
        </Button>
        {save.kind === "saved" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("saved")}
          </span>
        ) : null}
        {save.kind === "error" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {save.message}
          </span>
        ) : null}
      </div>
    </section>
  );
}
