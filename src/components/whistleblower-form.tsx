"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Send,
  EyeOff,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ROLE_OPTIONS, type AnonimChoice } from "@/lib/form-config";
import {
  WHISTLEBLOWER_CATEGORIES,
  type WhistleblowerCategory,
} from "@/lib/whistleblower-config";
import { cn } from "@/lib/utils";

type UnitGroup = {
  fakultas: string;
  hasFacultyLevel: boolean;
  prodi: string[];
};

type UnitsLoadState =
  | { kind: "loading" }
  | { kind: "ready"; groups: UnitGroup[] }
  | { kind: "error"; message: string };

type FormState = {
  saudaraAdalah: string;
  saudaraOther: string;
  fakultas: string;
  prodi: string;
  kategori: WhistleblowerCategory | "";
  pihakTerlibat: string;
  isAnonim: AnonimChoice;
  nama: string;
  nim: string;
  kontak: string;
  detail: string;
  kronologi: string;
  setuju: boolean;
};

const INITIAL_STATE: FormState = {
  saudaraAdalah: "",
  saudaraOther: "",
  fakultas: "",
  prodi: "",
  kategori: "",
  pihakTerlibat: "",
  isAnonim: "Ya", // default anonim ON
  nama: "",
  nim: "",
  kontak: "",
  detail: "",
  kronologi: "",
  setuju: false,
};

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

const DETAIL_MIN = 30;
const DETAIL_MAX = 5000;
const KRONOLOGI_MAX = 5000;
const PRODI_FACULTY_LEVEL_VALUE = "__faculty__";

export function WhistleblowerForm() {
  const router = useRouter();
  const t = useTranslations("whistleblowerForm");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("saranForm");
  const tCat = useTranslations("whistleblowerForm.categories");
  const [state, setState] = React.useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = React.useState<SubmitStatus>({ kind: "idle" });
  const [units, setUnits] = React.useState<UnitsLoadState>({ kind: "loading" });

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/units", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as
          | { groups?: UnitGroup[]; error?: string }
          | null;
        if (!alive) return;
        if (!res.ok) {
          setUnits({
            kind: "error",
            message:
              data?.error ??
              tStatus("errMuatUnit", { status: res.status }),
          });
          return;
        }
        setUnits({ kind: "ready", groups: data?.groups ?? [] });
      } catch (err) {
        if (!alive) return;
        setUnits({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : tCommon("errorLoading"),
        });
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [tCommon, tStatus]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const setFakultas = (fakultas: string) =>
    setState((s) => ({ ...s, fakultas, prodi: "" }));

  const role =
    state.saudaraAdalah === "Other"
      ? state.saudaraOther.trim()
      : state.saudaraAdalah;

  const selectedGroup =
    units.kind === "ready"
      ? units.groups.find((g) => g.fakultas === state.fakultas)
      : undefined;

  const validateClient = (): { ok: true } | { ok: false; message: string } => {
    if (!role) return { ok: false, message: t("errPilihPeran") };
    if (!state.fakultas)
      return { ok: false, message: t("errPilihFakultas") };
    const requireProdi = selectedGroup ? !selectedGroup.hasFacultyLevel : true;
    if (requireProdi && !state.prodi)
      return { ok: false, message: t("errPilihProdi") };
    if (!state.kategori)
      return { ok: false, message: t("errPilihKategori") };
    if (state.isAnonim === "Tidak" && !state.nama.trim())
      return { ok: false, message: t("errNamaWajib") };
    if (state.detail.trim().length < DETAIL_MIN)
      return {
        ok: false,
        message: t("errDetailMin", { min: DETAIL_MIN }),
      };
    if (!state.setuju)
      return { ok: false, message: t("errSetuju") };
    return { ok: true };
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const check = validateClient();
    if (!check.ok) {
      setStatus({ kind: "error", message: check.message });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const payload = {
        saudaraAdalah: role,
        fakultas: state.fakultas,
        prodi: state.prodi || undefined,
        kategori: state.kategori,
        pihakTerlibat: state.pihakTerlibat.trim() || undefined,
        isAnonim: state.isAnonim,
        nama: state.isAnonim === "Tidak" ? state.nama.trim() : undefined,
        nim:
          state.isAnonim === "Tidak"
            ? state.nim.trim() || undefined
            : undefined,
        kontak:
          state.isAnonim === "Tidak"
            ? state.kontak.trim() || undefined
            : undefined,
        detail: state.detail.trim(),
        kronologi: state.kronologi.trim() || undefined,
      };
      const res = await fetch("/api/whistleblower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setStatus({
          kind: "error",
          message:
            data?.error ?? t("errSubmit", { status: res.status }),
        });
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        caseId: string;
        timestamp: string;
      };
      router.push(
        `/whistleblower/terimakasih?case=${encodeURIComponent(data.caseId)}`,
      );
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : tCommon("couldNotConnect"),
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Disclaimer / warning banner */}
      <div className="flex gap-3 rounded-xl border border-rose-300/60 bg-rose-50/80 p-4 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
        <div className="space-y-1">
          <p className="font-semibold">{t("disclaimerTitle")}</p>
          <p>{t("disclaimerBody")}</p>
        </div>
      </div>

      {/* Section 1: Pelapor */}
      <fieldset className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
        <legend className="px-2 text-sm font-semibold text-foreground">
          {t("section1")}
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wb-role" className="mb-2 block">
              {t("saudaraAdalah")} <span className="text-rose-600">*</span>
            </Label>
            <Select
              id="wb-role"
              value={state.saudaraAdalah}
              onChange={(e) => update("saudaraAdalah", e.target.value)}
            >
              <option value="">{t("selectRole")}</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="Other">{t("lainnya")}</option>
            </Select>
            {state.saudaraAdalah === "Other" ? (
              <Input
                className="mt-2"
                placeholder={t("lainnyaPlaceholder")}
                value={state.saudaraOther}
                onChange={(e) => update("saudaraOther", e.target.value)}
              />
            ) : null}
          </div>

          <div>
            <Label className="mb-2 block">
              {t("unitProdi")} <span className="text-rose-600">*</span>
            </Label>
            {units.kind === "loading" ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                {tCommon("loadingShort")}…
              </div>
            ) : units.kind === "error" ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{units.message}</span>
              </div>
            ) : (
              <div className="grid gap-2">
                <Select
                  id="wb-fakultas"
                  value={state.fakultas}
                  onChange={(e) => setFakultas(e.target.value)}
                >
                  <option value="">{t("selectFakultas")}</option>
                  {units.groups.map((g) => (
                    <option key={g.fakultas} value={g.fakultas}>
                      {g.fakultas}
                    </option>
                  ))}
                </Select>
                <Select
                  id="wb-prodi"
                  value={
                    state.prodi ||
                    (selectedGroup?.hasFacultyLevel && state.fakultas
                      ? PRODI_FACULTY_LEVEL_VALUE
                      : "")
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    update(
                      "prodi",
                      v === PRODI_FACULTY_LEVEL_VALUE ? "" : v,
                    );
                  }}
                  disabled={!state.fakultas}
                >
                  {!state.fakultas ? (
                    <option value="">{t("selectFakultasFirst")}</option>
                  ) : (
                    <>
                      <option value="">{t("selectProdi")}</option>
                      {selectedGroup?.hasFacultyLevel ? (
                        <option value={PRODI_FACULTY_LEVEL_VALUE}>
                          {t("facultyLevelOnly")}
                        </option>
                      ) : null}
                      {(selectedGroup?.prodi ?? []).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </>
                  )}
                </Select>
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* Section 2: Privasi */}
      <fieldset className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
        <legend className="px-2 text-sm font-semibold text-foreground">
          {t("section2")}
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => update("isAnonim", "Ya")}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition",
              state.isAnonim === "Ya"
                ? "border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            <EyeOff className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t("anonimTitle")}</p>
              <p className="mt-0.5 text-xs opacity-80">{t("anonimDescr")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => update("isAnonim", "Tidak")}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition",
              state.isAnonim === "Tidak"
                ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/30"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            <Eye className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t("identitasTitle")}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {t("identitasDescr")}
              </p>
            </div>
          </button>
        </div>

        {state.isAnonim === "Tidak" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="wb-nama" className="mb-2 block">
                {t("namaLengkap")} <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="wb-nama"
                value={state.nama}
                onChange={(e) => update("nama", e.target.value)}
                placeholder={t("namaPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="wb-nim" className="mb-2 block">
                {t("nim")}
              </Label>
              <Input
                id="wb-nim"
                value={state.nim}
                onChange={(e) => update("nim", e.target.value)}
                placeholder={t("nimPlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="wb-kontak" className="mb-2 block">
                {t("kontak")}
              </Label>
              <Input
                id="wb-kontak"
                value={state.kontak}
                onChange={(e) => update("kontak", e.target.value)}
                placeholder={t("kontakPlaceholder")}
              />
            </div>
          </div>
        ) : null}
      </fieldset>

      {/* Section 3: Laporan */}
      <fieldset className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
        <legend className="px-2 text-sm font-semibold text-foreground">
          {t("section3")}
        </legend>

        <div>
          <Label htmlFor="wb-kategori" className="mb-2 block">
            {t("kategori")} <span className="text-rose-600">*</span>
          </Label>
          <Select
            id="wb-kategori"
            value={state.kategori}
            onChange={(e) =>
              update("kategori", e.target.value as WhistleblowerCategory | "")
            }
          >
            <option value="">{t("selectKategori")}</option>
            {WHISTLEBLOWER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCat(c)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="wb-pihak" className="mb-2 block">
            {t("pihakTerlibat")}
          </Label>
          <Input
            id="wb-pihak"
            value={state.pihakTerlibat}
            onChange={(e) => update("pihakTerlibat", e.target.value)}
            placeholder={t("pihakPlaceholder")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pihakHelp")}
          </p>
        </div>

        <div>
          <Label htmlFor="wb-detail" className="mb-2 block">
            {t("detail")} <span className="text-rose-600">*</span>
          </Label>
          <Textarea
            id="wb-detail"
            value={state.detail}
            onChange={(e) => update("detail", e.target.value)}
            placeholder={t("detailPlaceholder")}
            rows={5}
            maxLength={DETAIL_MAX}
          />
          <p className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{t("minChars", { min: DETAIL_MIN })}</span>
            <span>
              {state.detail.length} / {DETAIL_MAX}
            </span>
          </p>
        </div>

        <div>
          <Label htmlFor="wb-kronologi" className="mb-2 block">
            {t("kronologi")}
          </Label>
          <Textarea
            id="wb-kronologi"
            value={state.kronologi}
            onChange={(e) => update("kronologi", e.target.value)}
            placeholder={t("kronologiPlaceholder")}
            rows={4}
            maxLength={KRONOLOGI_MAX}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t.rich("kronologiHelp", {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
      </fieldset>

      {/* Section 4: Pernyataan */}
      <fieldset className="space-y-3 rounded-xl border border-border bg-card/60 p-5">
        <legend className="px-2 text-sm font-semibold text-foreground">
          {t("section4")}
        </legend>

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={state.setuju}
            onChange={(e) => update("setuju", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span className="text-foreground">
            {t.rich("agree", {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </span>
        </label>
      </fieldset>

      {/* Error */}
      {status.kind === "error" ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{status.message}</span>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={status.kind === "submitting"}
        className="w-full bg-rose-600 text-white hover:bg-rose-700 sm:w-auto"
      >
        {status.kind === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {t("submit")}
          </>
        )}
      </Button>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        {t.rich("afterCaseId", {
          b: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
    </form>
  );
}
