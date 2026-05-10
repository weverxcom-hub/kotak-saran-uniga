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
  Inbox,
  ShieldCheck,
  EyeOff,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Calendar,
  MessageSquareText,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/report/stat-card";
import { BreakdownList } from "@/components/report/breakdown-list";
import { ROLE_OPTIONS } from "@/lib/form-config";
import type { SubmissionRow, Stats } from "@/lib/sheets";
import { cn } from "@/lib/utils";

const LOCALE_TAG: Record<string, string> = { id: "id-ID", en: "en-US" };

type UnitGroup = {
  fakultas: string;
  hasFacultyLevel: boolean;
  prodi: string[];
};

/** Flatten daftar unit ke string label gabungan untuk filter dropdown. */
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
  role: string;
  unit: string;
  mode: "all" | "Ya" | "Tidak";
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: Filters = {
  q: "",
  role: "all",
  unit: "all",
  mode: "all",
  dateFrom: "",
  dateTo: "",
};

const PAGE_SIZE = 20;

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      rows: SubmissionRow[];
      total: number;
      totalAll: number;
      stats: Stats;
    };

function buildQuery(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.role !== "all") sp.set("role", f.role);
  if (f.unit !== "all") sp.set("unit", f.unit);
  if (f.mode !== "all") sp.set("mode", f.mode);
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

export function ReportDashboard() {
  const t = useTranslations("adminReport");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [pendingQ, setPendingQ] = React.useState("");
  const [load, setLoad] = React.useState<LoadState>({ kind: "idle" });
  const [page, setPage] = React.useState(0);
  const [openRow, setOpenRow] = React.useState<string | null>(null);
  const [unitOptions, setUnitOptions] = React.useState<string[]>([]);

  // Debounce pendingQ → filters.q
  React.useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === pendingQ ? f : { ...f, q: pendingQ }));
    }, 350);
    return () => clearTimeout(t);
  }, [pendingQ]);

  // Fetch daftar unit untuk filter dropdown.
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

  const fetchData = React.useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const qs = buildQuery(filters);
      const res = await fetch(`/api/report/list${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
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
        rows: SubmissionRow[];
        total: number;
        totalAll: number;
        stats: Stats;
      };
      setLoad({
        kind: "ready",
        rows: data.rows,
        total: data.total,
        totalAll: data.totalAll,
        stats: data.stats,
      });
      setPage(0);
    } catch (err) {
      setLoad({
        kind: "error",
        message:
          err instanceof Error ? err.message : tCommon("couldNotConnect"),
      });
    }
  }, [filters, t, tCommon]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onLogout = async () => {
    await fetch("/api/report/login", { method: "DELETE" });
    window.location.href = "/report/login";
  };

  const onExportCSV = () => {
    const qs = buildQuery(filters);
    window.location.href = `/api/report/export${qs ? `?${qs}` : ""}`;
  };

  const onResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPendingQ("");
  };

  const hasActiveFilters =
    filters.q !== "" ||
    filters.role !== "all" ||
    filters.unit !== "all" ||
    filters.mode !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  const rows = load.kind === "ready" ? load.rows : [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const localeNumber = LOCALE_TAG[locale] ?? "id-ID";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalMasukan")}
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
          icon={<Inbox className="h-5 w-5" />}
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

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
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
            <Label htmlFor="q" className="mb-1.5 block text-xs">
              {t("search")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="q"
                value={pendingQ}
                onChange={(e) => setPendingQ(e.target.value)}
                placeholder={t("searchPlaceholderSaran")}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role" className="mb-1.5 block text-xs">
              {t("peran")}
            </Label>
            <Select
              id="role"
              value={filters.role}
              onChange={(e) =>
                setFilters((f) => ({ ...f, role: e.target.value }))
              }
            >
              <option value="all">{tCommon("all")}</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="unit" className="mb-1.5 block text-xs">
              {t("unit")}
            </Label>
            <Select
              id="unit"
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
            <Label htmlFor="mode" className="mb-1.5 block text-xs">
              {t("mode")}
            </Label>
            <Select
              id="mode"
              value={filters.mode}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  mode: e.target.value as Filters["mode"],
                }))
              }
            >
              <option value="all">{tCommon("all")}</option>
              <option value="Tidak">{tCommon("identitas")}</option>
              <option value="Ya">{tCommon("anonim")}</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="from" className="mb-1.5 block text-xs">
              {t("dateFrom")}
            </Label>
            <Input
              id="from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="to" className="mb-1.5 block text-xs">
              {t("dateTo")}
            </Label>
            <Input
              id="to"
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
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
            variant="gradient"
            size="sm"
            onClick={onExportCSV}
            disabled={load.kind !== "ready" || load.total === 0}
            className="ml-auto"
          >
            <Download className="h-4 w-4" />
            {t("exportCsv")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            {t("keluar")}
          </Button>
        </div>
      </section>

      {/* Breakdown */}
      {load.kind === "ready" && load.stats.total > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <BreakdownList
            title={t("perRole")}
            items={Object.entries(load.stats.perRole)}
            total={load.stats.total}
          />
          <BreakdownList
            title={t("perUnit")}
            items={Object.entries(load.stats.perUnit)}
            total={load.stats.total}
          />
        </section>
      ) : null}

      {/* Table */}
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="h-4 w-4 text-primary" />
            {t("daftarMasukan")}
            {load.kind === "ready" ? (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {load.total}
              </span>
            ) : null}
          </h2>
          {load.kind === "ready" && rows.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("pageOf", { current: safePage + 1, total: totalPages })}
            </p>
          ) : null}
        </div>

        {load.kind === "loading" ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingFromSheets")}
          </div>
        ) : load.kind === "error" ? (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">{t("cantLoadData")}</p>
              <p className="text-destructive/90">{load.message}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchData}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-4 w-4" />
                {tCommon("tryAgain")}
              </Button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              {t("saranNoMatch")}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters
                ? t("relaxFilter")
                : t("saranNoneAll")}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">{t("thWaktu")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("thPeran")}</th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("thUnit")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">{t("thMode")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("thNama")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("thMasukan")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const isAnonim = /ya|anonim/i.test(r.isAnonim);
                    const key = `${r.rowIndex}`;
                    const open = openRow === key;
                    return (
                      <React.Fragment key={key}>
                        <tr
                          className="cursor-pointer border-b border-border/60 transition hover:bg-muted/30"
                          onClick={() => setOpenRow(open ? null : key)}
                        >
                          <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(r.timestamp, locale)}
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={r.saudaraAdalah} />
                          </td>
                          <td className="px-4 py-3 max-w-[16ch] truncate text-foreground">
                            {r.unitKerja || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {isAnonim ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                                <EyeOff className="h-3 w-3" /> {tCommon("anonim")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                                <ShieldCheck className="h-3 w-3" /> {tCommon("identitas")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {isAnonim ? (
                              <span className="text-muted-foreground">
                                {t("anonimLabel")}
                              </span>
                            ) : (
                              r.nama || "—"
                            )}
                          </td>
                          <td className="max-w-[40ch] px-4 py-3">
                            <p className="line-clamp-2 text-foreground">
                              {r.masukan || "—"}
                            </p>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-muted/20">
                            <td colSpan={6} className="px-4 py-4">
                              <DetailPanel row={r} />
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {pageRows.map((r) => {
                const isAnonim = /ya|anonim/i.test(r.isAnonim);
                const key = `${r.rowIndex}`;
                const open = openRow === key;
                return (
                  <li key={key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenRow(open ? null : key)}
                      className="flex w-full flex-col gap-2 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <RoleBadge role={r.saudaraAdalah} />
                          {isAnonim ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                              <EyeOff className="h-3 w-3" /> {tCommon("anonim")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              <ShieldCheck className="h-3 w-3" /> {tCommon("identitas")}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {isAnonim ? t("anonimLabel") : r.nama || "—"}
                        </span>
                        <span>·</span>
                        <span className="truncate">{r.unitKerja || "—"}</span>
                      </div>
                      <p
                        className={cn(
                          "text-sm text-foreground",
                          !open && "line-clamp-2",
                        )}
                      >
                        {r.masukan || "—"}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatDateTime(r.timestamp, locale)}
                      </p>
                    </button>
                    {open ? (
                      <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
                        <DetailPanel row={r} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
                <p className="text-xs text-muted-foreground">
                  {t.rich("showing", {
                    from: safePage * PAGE_SIZE + 1,
                    to: Math.min((safePage + 1) * PAGE_SIZE, rows.length),
                    total: rows.length,
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("prev")}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={safePage >= totalPages - 1}
                  >
                    <span className="hidden sm:inline">{t("nextPage")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const t = useTranslations("adminReport");
  if (!role)
    return (
      <span className="text-xs text-muted-foreground">{t("belumDiisi")}</span>
    );
  const palette: Record<string, string> = {
    DOSEN: "bg-primary/10 text-primary",
    MAHASISWA: "bg-accent/10 text-accent",
    TENDIK: "bg-success/10 text-success",
  };
  const cls = palette[role] ?? "bg-muted text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <Users className="h-3 w-3" />
      {role}
    </span>
  );
}

function DetailPanel({ row }: { row: SubmissionRow }) {
  const t = useTranslations("adminReport");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isAnonim = /ya|anonim/i.test(row.isAnonim);
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <Field label={t("dWaktuMasuk")} value={formatDateTime(row.timestamp, locale)} />
      <Field
        label={t("dMode")}
        value={
          isAnonim ? (
            <span className="text-accent">{tCommon("anonim")}</span>
          ) : (
            <span className="text-success">{tCommon("identitas")}</span>
          )
        }
      />
      <Field label={t("dPeran")} value={row.saudaraAdalah || "—"} />
      <Field
        label={t("dUnit")}
        value={
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            {row.unitKerja || "—"}
          </span>
        }
      />
      {!isAnonim ? (
        <>
          <Field label={t("dNama")} value={row.nama || "—"} />
          <Field label={t("dNim")} value={row.nim || "—"} />
        </>
      ) : null}
      <Field
        label={t("dMasukan")}
        value={row.masukan || "—"}
        className="sm:col-span-2"
      />
      {row.kronologi ? (
        <Field
          label={t("dKronologi")}
          value={row.kronologi}
          className="sm:col-span-2"
        />
      ) : null}
      {row.kontak ? (
        <Field
          label={t("dKontak")}
          value={row.kontak}
          className="sm:col-span-2"
        />
      ) : null}
    </dl>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap break-words text-foreground">
        {value}
      </dd>
    </div>
  );
}
