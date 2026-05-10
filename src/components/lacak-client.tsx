"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const STATUS_META: Record<
  PublicStatus["status"],
  {
    label: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
    /** Kelas tailwind utuh untuk badge & indikator. */
    badge: string;
    iconWrap: string;
  }
> = {
  Diterima: {
    label: "Diterima",
    description:
      "Laporan Anda sudah masuk ke sistem dan menunggu proses verifikasi awal oleh pengelola.",
    Icon: Clock,
    badge:
      "border-amber-300/50 bg-amber-100/60 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
    iconWrap:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  "Sedang ditindaklanjuti": {
    label: "Sedang ditindaklanjuti",
    description:
      "Pengelola sudah memverifikasi laporan dan saat ini sedang melakukan tindak lanjut. Mohon menunggu update berikutnya.",
    Icon: Loader2,
    badge:
      "border-primary/40 bg-primary/10 text-primary dark:bg-primary/20",
    iconWrap: "bg-primary/15 text-primary",
  },
  Selesai: {
    label: "Selesai",
    description:
      "Tindak lanjut atas laporan ini telah dirampungkan. Lihat catatan publik di bawah untuk ringkasan hasil.",
    Icon: CheckCircle2,
    badge:
      "border-emerald-300/50 bg-emerald-100/60 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
    iconWrap:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  "Ditolak / Tidak relevan": {
    label: "Ditolak / Tidak relevan",
    description:
      "Laporan tidak dapat ditindaklanjuti karena alasan tertentu (mis. di luar lingkup, data tidak cukup). Lihat catatan publik untuk penjelasan.",
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
  const [caseId, setCaseId] = React.useState(initialCaseId);
  const [state, setState] = React.useState<LookupState>({ kind: "idle" });

  const lookup = React.useCallback(async (rawId: string) => {
    const trimmed = rawId.trim();
    if (!trimmed) {
      setState({
        kind: "error",
        message: "Masukkan Case ID terlebih dulu.",
      });
      return;
    }
    if (!/^[A-Za-z0-9-]{4,40}$/.test(trimmed)) {
      setState({
        kind: "error",
        message:
          "Format Case ID tidak valid. Contoh: WB-20260509-A4F1.",
      });
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
            "Case ID tidak ditemukan.",
        });
        return;
      }
      if (!res.ok) {
        setState({
          kind: "error",
          message:
            (data as { error?: string } | null)?.error ??
            `Gagal memuat status (HTTP ${res.status}).`,
        });
        return;
      }
      setState({ kind: "found", data: data as PublicStatus });
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error
            ? `Tidak dapat terhubung: ${err.message}`
            : "Tidak dapat terhubung ke server.",
      });
    }
  }, []);

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
          Case ID
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Format: <code className="rounded bg-muted px-1 py-0.5 text-foreground">WB-YYYYMMDD-XXXX</code>
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
                Memeriksa…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lacak
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
              <p className="mt-1 text-xs">
                Pastikan Anda menyalin Case ID persis seperti yang
                ditampilkan setelah submit laporan, termasuk huruf besar
                dan tanda hubungnya.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === "found" ? <ResultCard data={state.data} /> : null}
    </div>
  );
}

function ResultCard({ data }: { data: PublicStatus }) {
  const meta = STATUS_META[data.status] ?? STATUS_META["Diterima"];
  const { Icon } = meta;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            meta.iconWrap,
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
            Status laporan
          </p>
          <p className="mt-0.5 text-lg font-semibold text-foreground sm:text-xl">
            {meta.label}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
            meta.badge,
          )}
        >
          {meta.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{meta.description}</p>

      <dl className="mt-5 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Case ID
          </dt>
          <dd className="mt-0.5 break-all font-mono text-foreground">
            {data.caseId}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kategori
          </dt>
          <dd className="mt-0.5 text-foreground">{data.kategori || "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tanggal lapor
          </dt>
          <dd className="mt-0.5 text-foreground">
            {formatTimestamp(data.reportedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Update terakhir
          </dt>
          <dd className="mt-0.5 text-foreground">
            {formatTimestamp(data.statusUpdatedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Catatan publik dari pengelola
        </p>
        {data.catatanPublik ? (
          <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm text-foreground">
            {data.catatanPublik}
          </p>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm italic text-muted-foreground">
            Belum ada catatan publik. Silakan cek kembali nanti.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Demi keamanan, isi laporan, identitas pelapor, dan kontak{" "}
        <strong>tidak</strong> ditampilkan di halaman ini meskipun Case ID
        cocok.
      </p>
    </article>
  );
}

function formatTimestamp(value: string): string {
  if (!value) return "—";
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  return new Date(t).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
