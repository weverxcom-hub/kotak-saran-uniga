"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OptionCard } from "@/components/option-card";
import {
  ROLE_OPTIONS,
  type AnonimChoice,
  type SuggestionPayload,
} from "@/lib/form-config";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** Resolve translated description for a role; fallback to label if missing. */
function roleDescr(
  t: ReturnType<typeof useTranslations<"saranForm">>,
  role: string,
): string | undefined {
  const key =
    role === "DOSEN"
      ? "roleDosenDescr"
      : role === "MAHASISWA"
      ? "roleMahasiswaDescr"
      : role === "TENDIK"
      ? "roleTendikDescr"
      : null;
  return key ? t(key) : undefined;
}

type UnitGroup = {
  fakultas: string;
  /** True bila fakultas ini juga punya entri level fakultas (prodi kosong). */
  hasFacultyLevel: boolean;
  /** Daftar prodi (tanpa entri level fakultas). */
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
  isAnonim: AnonimChoice | "";
  nama: string;
  nim: string;
  masukan: string;
  kronologi: string;
  kontak: string;
};

const INITIAL_STATE: FormState = {
  saudaraAdalah: "",
  saudaraOther: "",
  fakultas: "",
  prodi: "",
  isAnonim: "",
  nama: "",
  nim: "",
  masukan: "",
  kronologi: "",
  kontak: "",
};

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const PRODI_FACULTY_LEVEL_VALUE = "__faculty__";

export function SaranForm() {
  const t = useTranslations("saranForm");
  const tCommon = useTranslations("common");
  const [state, setState] = React.useState<FormState>(INITIAL_STATE);
  const [honeypot, setHoneypot] = React.useState("");
  const [status, setStatus] = React.useState<SubmitStatus>({ kind: "idle" });
  const [units, setUnits] = React.useState<UnitsLoadState>({ kind: "loading" });
  const errorRef = React.useRef<HTMLDivElement>(null);

  // Fetch daftar fakultas + prodi dari /api/units saat mount.
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
            message: data?.error ?? t("errMuatUnit", { status: res.status }),
          });
          return;
        }
        setUnits({ kind: "ready", groups: data?.groups ?? [] });
      } catch (err) {
        if (!alive) return;
        setUnits({
          kind: "error",
          message: err instanceof Error ? err.message : tCommon("errorLoading"),
        });
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [t, tCommon]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const setFakultas = (fakultas: string) =>
    setState((s) => ({ ...s, fakultas, prodi: "" }));

  const selectedGroup =
    units.kind === "ready"
      ? units.groups.find((g) => g.fakultas === state.fakultas)
      : undefined;

  /** Validasi seluruh form sekaligus; kembalikan pesan pertama yang gagal. */
  const firstError = (): string | null => {
    const role =
      state.saudaraAdalah === "Other" ? state.saudaraOther.trim() : state.saudaraAdalah;
    if (!role) return t("errPilihPeran");
    if (!state.fakultas) return t("errPilihFakultas");
    const requireProdi = selectedGroup ? !selectedGroup.hasFacultyLevel : true;
    if (requireProdi && !state.prodi) return t("errPilihProdi");
    if (!state.isAnonim) return t("errPilihAnonim");
    if (state.isAnonim === "Tidak" && !state.nama.trim()) return t("errNamaWajib");
    if (state.masukan.trim().length < 10) return t("errMasukanMin");
    return null;
  };

  const showError = (message: string) => {
    setStatus({ kind: "error", message });
    requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = firstError();
    if (err) return showError(err);
    setStatus({ kind: "submitting" });
    const finalRole =
      state.saudaraAdalah === "Other" ? state.saudaraOther.trim() : state.saudaraAdalah;
    const payload: SuggestionPayload & { website?: string } = {
      saudaraAdalah: finalRole,
      fakultas: state.fakultas,
      prodi: state.prodi || undefined,
      isAnonim: state.isAnonim || "Tidak",
      nama: state.isAnonim === "Tidak" ? state.nama.trim() : undefined,
      nim: state.isAnonim === "Tidak" ? state.nim.trim() || undefined : undefined,
      masukan: state.masukan.trim(),
      kronologi: state.kronologi.trim() || undefined,
      kontak: state.kontak.trim() || undefined,
      website: honeypot || undefined,
    };
    try {
      const res = await fetch("/api/saran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        return showError(data?.error ?? t("errKirim"));
      }
      setStatus({ kind: "success" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      showError(tCommon("couldNotConnect"));
    }
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setStatus({ kind: "idle" });
  };

  if (status.kind === "success")
    return <SuccessScreen onReset={reset} state={state} t={t} tCommon={tCommon} />;

  return (
    <form onSubmit={submit} noValidate className="w-full">
      {/* Field jebakan untuk bot. Tidak terlihat dan tidak bisa difokus manusia. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            name="website"
          />
        </label>
      </div>

      <FormSection number={1} title={t("stepTentangAnda")} description={t("tentangDescr")}>
        <StepTentangAnda
          state={state}
          update={update}
          setFakultas={setFakultas}
          units={units}
          selectedGroup={selectedGroup}
          t={t}
          tCommon={tCommon}
        />
      </FormSection>

      <FormSection number={2} title={t("stepPrivasi")} description={t("privasiDescr")}>
        <StepPrivasi state={state} update={update} t={t} />
      </FormSection>

      <FormSection
        number={3}
        title={t("stepMasukan")}
        description={t("masukanDescr", { short: SITE_CONFIG.universityShort })}
      >
        <StepMasukan state={state} update={update} t={t} />
      </FormSection>

      <div className="border-t border-border pt-6">
        <div ref={errorRef} aria-live="assertive">
          {status.kind === "error" ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{status.message}</span>
            </div>
          ) : null}
        </div>
        <p className="mb-5 max-w-2xl text-sm text-muted-foreground">
          {t.rich("submitDisclaimer", {
            university: SITE_CONFIG.universityName,
            b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={status.kind === "submitting"}
          className="w-full sm:w-auto"
        >
          {status.kind === "submitting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("submitting")}
            </>
          ) : (
            t("kirimMasukan")
          )}
        </Button>
      </div>
    </form>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-x-10 gap-y-5 border-t border-border py-8 md:grid-cols-[13rem_1fr]">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden>
        <p className="font-mono text-xs text-muted-foreground">0{number}</p>
        <p className="mt-1 font-serif text-xl font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </fieldset>
  );
}

function StepTentangAnda({
  state,
  update,
  setFakultas,
  units,
  selectedGroup,
  t,
  tCommon,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setFakultas: (fakultas: string) => void;
  units: UnitsLoadState;
  selectedGroup: UnitGroup | undefined;
  t: ReturnType<typeof useTranslations<"saranForm">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
}) {
  return (
    <div className="space-y-6">

      <div>
        <Label className="mb-3 block">
          {t("saudaraAdalah")} <span className="text-destructive">*</span>
        </Label>
        <div className="grid gap-2" role="radiogroup">
          {ROLE_OPTIONS.map((role) => {
            return (
              <OptionCard
                key={role}
                label={role}
                description={roleDescr(t, role)}
                selected={state.saudaraAdalah === role}
                onClick={() => update("saudaraAdalah", role)}
              />
            );
          })}
        </div>
        <div className="mt-2">
          <OptionCard
            size="sm"
            label={t("lainnya")}
            description={t("lainnyaDescr")}
            selected={state.saudaraAdalah === "Other"}
            onClick={() => update("saudaraAdalah", "Other")}
          />
          {state.saudaraAdalah === "Other" ? (
            <Input
              className="mt-2"
              placeholder={t("lainnyaPlaceholder")}
              value={state.saudaraOther}
              onChange={(e) => update("saudaraOther", e.target.value)}
              maxLength={100}
            />
          ) : null}
        </div>
      </div>

      <div>
        <Label className="mb-3 block">
          {t("unitLabel")}{" "}
          <span className="text-destructive">*</span>
        </Label>

        {units.kind === "loading" ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingUnits")}
          </div>
        ) : units.kind === "error" ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{units.message}</span>
          </div>
        ) : units.groups.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("noUnits")}</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="form-fakultas"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                {t("fakultas")} <span className="text-destructive">*</span>
              </Label>
              <Select
                id="form-fakultas"
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
            </div>
            <div>
              <Label
                htmlFor="form-prodi"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                {t("prodi")}{" "}
                {selectedGroup?.hasFacultyLevel ? (
                  <span className="font-normal text-muted-foreground">
                    {t("prodiFacultyLevel")}
                  </span>
                ) : (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Select
                id="form-prodi"
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
          </div>
        )}
      </div>
    </div>
  );
}

function StepPrivasi({
  state,
  update,
  t,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  t: ReturnType<typeof useTranslations<"saranForm">>;
}) {
  return (
    <div className="space-y-6">

      <div className="grid gap-2" role="radiogroup">
        <OptionCard
          label={t("withIdentitas")}
          description={t("withIdentitasDescr", {
            short: SITE_CONFIG.universityShort,
          })}
          selected={state.isAnonim === "Tidak"}
          onClick={() => update("isAnonim", "Tidak")}
        />
        <OptionCard
          label={t("anonim")}
          description={t("anonimDescr")}
          selected={state.isAnonim === "Ya"}
          onClick={() => update("isAnonim", "Ya")}
        />
      </div>

      {state.isAnonim === "Tidak" ? (
        <div className="space-y-4 border-l-2 border-primary/60 pl-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            {t("identitasHeader")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nama" className="mb-1.5 block">
                {t("namaLabel")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nama"
                placeholder={t("namaPlaceholder")}
                value={state.nama}
                onChange={(e) => update("nama", e.target.value)}
                maxLength={150}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="nim" className="mb-1.5 block">
                {t("nimLabel")}{" "}
                <span className="text-muted-foreground font-normal">
                  (opsional)
                </span>
              </Label>
              <Input
                id="nim"
                placeholder={t("nimPlaceholder")}
                value={state.nim}
                onChange={(e) => update("nim", e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
        </div>
      ) : null}

      {state.isAnonim === "Ya" ? (
        <div className="flex items-start gap-3 border-l-2 border-accent pl-4 text-sm text-foreground">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
          <div className="space-y-1">
            <p className="font-medium">{t("anonActiveTitle")}</p>
            <p className="text-muted-foreground">{t("anonActiveDescr")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepMasukan({
  state,
  update,
  t,
}: {
  state: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  t: ReturnType<typeof useTranslations<"saranForm">>;
}) {
  const masukanLen = state.masukan.length;
  const minOk = masukanLen >= 10;
  return (
    <div className="space-y-6">

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="masukan">
            {t("masukanLabel")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <span
            className={cn(
              "text-xs",
              minOk ? "text-success" : "text-muted-foreground",
            )}
          >
            {masukanLen} / 5000
          </span>
        </div>
        <Textarea
          id="masukan"
          placeholder={t("masukanPlaceholder")}
          value={state.masukan}
          onChange={(e) => update("masukan", e.target.value)}
          maxLength={5000}
          rows={5}
        />
        {!minOk ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("masukanMin")}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="kronologi" className="mb-1.5 block">
          {t("kronologiLabel")}{" "}
          <span className="text-muted-foreground font-normal">
            (opsional)
          </span>
        </Label>
        <Textarea
          id="kronologi"
          placeholder={t("kronologiPlaceholder")}
          value={state.kronologi}
          onChange={(e) => update("kronologi", e.target.value)}
          maxLength={5000}
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="kontak" className="mb-1.5 block">
          {t("kontakLabel")}{" "}
          <span className="text-muted-foreground font-normal">
            (opsional)
          </span>
        </Label>
        <Input
          id="kontak"
          inputMode="tel"
          placeholder={t("kontakPlaceholder")}
          value={state.kontak}
          onChange={(e) => update("kontak", e.target.value)}
          maxLength={50}
          autoComplete="tel"
        />
      </div>
    </div>
  );
}

function SuccessScreen({
  onReset,
  state,
  t,
  tCommon,
}: {
  onReset: () => void;
  state: FormState;
  t: ReturnType<typeof useTranslations<"saranForm">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
}) {
  const name =
    state.isAnonim === "Ya" ? t("successAnonymous") : state.nama || t("successYou");
  return (
    <div className="border-t-4 border-success bg-card px-6 py-8 sm:px-8" role="status">
      <CheckCircle2 className="h-7 w-7 text-success" aria-hidden />
      <h2 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl">
        {t("successTitle")}
      </h2>
      <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
        {t.rich("successDescr", {
          name,
          university: SITE_CONFIG.universityName,
          b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
        })}
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button onClick={onReset} size="lg">
          {t("successKirimLain")}
        </Button>
        <a
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md border border-input px-5 text-sm font-semibold text-foreground hover:bg-muted"
        >
          {tCommon("backToHome")}
        </a>
      </div>
    </div>
  );
}
