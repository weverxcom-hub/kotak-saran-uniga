"use client";

import * as React from "react";
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Pencil,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UnitRow = {
  rowIndex: number;
  id: string;
  fakultas: string;
  prodi: string;
  aktif: boolean;
  urutan: number;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; rows: UnitRow[] }
  | { kind: "error"; message: string };

type FormState = {
  fakultas: string;
  prodi: string;
  urutan: string;
  aktif: boolean;
};

const EMPTY_FORM: FormState = {
  fakultas: "",
  prodi: "",
  urutan: "",
  aktif: true,
};

export function UnitsManager() {
  const [load, setLoad] = React.useState<LoadState>({ kind: "idle" });
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [editForm, setEditForm] = React.useState<FormState>(EMPTY_FORM);
  const [seeding, setSeeding] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/units", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | { units?: UnitRow[]; error?: string }
        | null;
      if (!res.ok) {
        setLoad({
          kind: "error",
          message: data?.error ?? `Gagal memuat (${res.status}).`,
        });
        return;
      }
      setLoad({ kind: "ready", rows: data?.units ?? [] });
    } catch (err) {
      setLoad({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Tidak dapat terhubung.",
      });
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fakultas: form.fakultas.trim(),
          prodi: form.prodi.trim() || undefined,
          aktif: form.aktif,
          urutan: form.urutan ? Number(form.urutan) : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        setGlobalError(data?.error ?? `Gagal menambahkan (${res.status}).`);
        return;
      }
      setForm(EMPTY_FORM);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (row: UnitRow) => {
    setEditing(row.rowIndex);
    setEditForm({
      fakultas: row.fakultas,
      prodi: row.prodi,
      urutan: String(row.urutan),
      aktif: row.aktif,
    });
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditForm(EMPTY_FORM);
  };

  const onUpdate = async (row: UnitRow) => {
    setGlobalError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/units/${row.rowIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          fakultas: editForm.fakultas.trim(),
          prodi: editForm.prodi.trim(),
          aktif: editForm.aktif,
          urutan: editForm.urutan ? Number(editForm.urutan) : 9999,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        setGlobalError(data?.error ?? `Gagal menyimpan (${res.status}).`);
        return;
      }
      cancelEdit();
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (row: UnitRow) => {
    if (
      !confirm(
        `Hapus unit "${row.fakultas}${row.prodi ? " — " + row.prodi : ""}"? Tindakan ini permanen.`,
      )
    )
      return;
    setGlobalError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/units/${row.rowIndex}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!res.ok) {
        setGlobalError(data?.error ?? `Gagal menghapus (${res.status}).`);
        return;
      }
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onSeed = async () => {
    if (
      !confirm(
        "Isi tab Units dengan daftar default Universitas Gajayana Malang? Hanya berjalan kalau tab masih kosong.",
      )
    )
      return;
    setGlobalError(null);
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/units/seed", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; inserted?: number; error?: string }
        | null;
      if (!res.ok) {
        setGlobalError(data?.error ?? `Gagal seed (${res.status}).`);
        return;
      }
      if (data?.inserted === 0) {
        setGlobalError(
          "Tab Units sudah berisi data. Tidak ada yang ditambahkan.",
        );
      }
      await refresh();
    } finally {
      setSeeding(false);
    }
  };

  // Group rows by fakultas for nice display
  const groups = React.useMemo(() => {
    if (load.kind !== "ready") return [] as Array<{ fakultas: string; rows: UnitRow[] }>;
    const map = new Map<string, UnitRow[]>();
    for (const r of load.rows) {
      const key = r.fakultas || "(tanpa fakultas)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([fakultas, rows]) => ({
      fakultas,
      rows,
    }));
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Header / actions */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Daftar Fakultas &amp; Program Studi
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Tambah, ubah, atau nonaktifkan unit yang muncul di form publik.
              Data tersimpan di tab <code className="rounded bg-muted px-1">Units</code>{" "}
              pada Google Spreadsheet. Perubahan baru terlihat di form publik
              dalam ~1 menit (cache server-side).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={load.kind === "loading"}
            >
              <RefreshCw
                className={
                  "h-4 w-4 " + (load.kind === "loading" ? "animate-spin" : "")
                }
              />
              Muat ulang
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onSeed()}
              disabled={seeding || submitting}
            >
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Mengisi…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Isi default UNIGA Malang
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Add form */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plus className="h-4 w-4 text-primary" /> Tambah unit baru
        </h3>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <Label htmlFor="add-fakultas" className="mb-1.5 block text-xs">
              Fakultas <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-fakultas"
              value={form.fakultas}
              onChange={(e) =>
                setForm((f) => ({ ...f, fakultas: e.target.value }))
              }
              placeholder="mis. FAKULTAS TEKNIK DAN INFORMATIKA"
              required
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="add-prodi" className="mb-1.5 block text-xs">
              Prodi <span className="text-muted-foreground">(opsional)</span>
            </Label>
            <Input
              id="add-prodi"
              value={form.prodi}
              onChange={(e) =>
                setForm((f) => ({ ...f, prodi: e.target.value }))
              }
              placeholder="mis. SISTEM INFORMASI"
              disabled={submitting}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="add-urutan" className="mb-1.5 block text-xs">
              Urutan
            </Label>
            <Input
              id="add-urutan"
              type="number"
              inputMode="numeric"
              value={form.urutan}
              onChange={(e) =>
                setForm((f) => ({ ...f, urutan: e.target.value }))
              }
              placeholder="9999"
              disabled={submitting}
            />
          </div>
          <div className="flex items-end sm:col-span-1">
            <Button
              type="submit"
              variant="gradient"
              size="default"
              disabled={submitting || !form.fakultas.trim()}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="sr-only sm:not-sr-only">Tambah</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-12">
            Kosongkan kolom <strong>Prodi</strong> kalau ini entri tingkat
            fakultas (mis. layanan dekanat). Urutan kecil tampil dulu — biasakan
            kelipatan 10 supaya mudah disisipkan.
          </p>
        </form>
      </section>

      {globalError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      ) : null}

      {/* List */}
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold text-foreground">
            Daftar tersimpan
            {load.kind === "ready" ? (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {load.rows.length}
              </span>
            ) : null}
          </h3>
        </div>

        {load.kind === "idle" || load.kind === "loading" ? (
          <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : load.kind === "error" ? (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{load.message}</span>
          </div>
        ) : load.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              Belum ada unit.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Klik <strong>Isi default UNIGA Malang</strong> untuk seed cepat, atau
              tambah manual lewat form di atas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groups.map((g) => (
              <div key={g.fakultas} className="px-4 py-3 sm:px-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.fakultas}
                </p>
                <ul className="space-y-2">
                  {g.rows.map((row) => {
                    const isEditing = editing === row.rowIndex;
                    return (
                      <li
                        key={row.rowIndex}
                        className="rounded-lg border border-border/60 bg-background/40 p-3"
                      >
                        {isEditing ? (
                          <div className="grid gap-2 sm:grid-cols-12">
                            <div className="sm:col-span-5">
                              <Label className="mb-1 block text-[11px]">
                                Fakultas
                              </Label>
                              <Input
                                value={editForm.fakultas}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    fakultas: e.target.value,
                                  }))
                                }
                                disabled={submitting}
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <Label className="mb-1 block text-[11px]">
                                Prodi
                              </Label>
                              <Input
                                value={editForm.prodi}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    prodi: e.target.value,
                                  }))
                                }
                                disabled={submitting}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="mb-1 block text-[11px]">
                                Urutan
                              </Label>
                              <Input
                                type="number"
                                value={editForm.urutan}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    urutan: e.target.value,
                                  }))
                                }
                                disabled={submitting}
                              />
                            </div>
                            <div className="flex items-end gap-2 sm:col-span-2">
                              <label className="flex items-center gap-1.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editForm.aktif}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      aktif: e.target.checked,
                                    }))
                                  }
                                  disabled={submitting}
                                  className="h-4 w-4 rounded border-input"
                                />
                                Aktif
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-2 sm:col-span-12">
                              <Button
                                type="button"
                                size="sm"
                                variant="gradient"
                                disabled={
                                  submitting || !editForm.fakultas.trim()
                                }
                                onClick={() => void onUpdate(row)}
                              >
                                {submitting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                Simpan
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={submitting}
                              >
                                <X className="h-4 w-4" /> Batal
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {row.prodi || (
                                  <span className="italic text-muted-foreground">
                                    (tingkat fakultas)
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                <span>
                                  id: <code>{row.id}</code>
                                </span>
                                <span>urutan: {row.urutan}</span>
                                {row.aktif ? (
                                  <span className="inline-flex items-center gap-1 text-success">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Nonaktif
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(row)}
                                disabled={submitting}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Ubah
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => void onDelete(row)}
                                disabled={submitting}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
