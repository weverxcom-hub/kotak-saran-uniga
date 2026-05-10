"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  EyeOff,
  Eye,
  GraduationCap,
  Briefcase,
  Users,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PartyPopper,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OptionCard } from "@/components/option-card";
import { ProgressSteps, type Step } from "@/components/progress-steps";
import {
  ROLE_OPTIONS,
  type AnonimChoice,
  type SuggestionPayload,
} from "@/lib/form-config";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<string, React.ElementType> = {
  DOSEN: GraduationCap,
  MAHASISWA: Users,
  TENDIK: Briefcase,
};

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

function buildSteps(
  t: ReturnType<typeof useTranslations<"saranForm">>,
): Step[] {
  return [
    { id: 1, title: t("stepTentangAnda") },
    { id: 2, title: t("stepPrivasi") },
    { id: 3, title: t("stepMasukan") },
    { id: 4, title: t("stepTinjau") },
  ];
}

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
  const STEPS = React.useMemo(() => buildSteps(t), [t]);
  const [step, setStep] = React.useState(1);
  const [state, setState] = React.useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = React.useState<SubmitStatus>({ kind: "idle" });
  const [units, setUnits] = React.useState<UnitsLoadState>({ kind: "loading" });
  const containerRef = React.useRef<HTMLDivElement>(null);

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
            message:
              data?.error ??
              t("errMuatUnit", { status: res.status }),
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
  }, [t, tCommon]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const setFakultas = (fakultas: string) =>
    setState((s) => ({ ...s, fakultas, prodi: "" }));

  const selectedGroup =
    units.kind === "ready"
      ? units.groups.find((g) => g.fakultas === state.fakultas)
      : undefined;

  const canProceed = (s: number): { ok: boolean; message?: string } => {
    if (s === 1) {
      const role = state.saudaraAdalah === "Other"
        ? state.saudaraOther.trim()
        : state.saudaraAdalah;
      if (!role) return { ok: false, message: t("errPilihPeran") };
      if (!state.fakultas)
        return { ok: false, message: t("errPilihFakultas") };
      const group = selectedGroup;
      const requireProdi = group ? !group.hasFacultyLevel : true;
      if (requireProdi && !state.prodi)
        return { ok: false, message: t("errPilihProdi") };
    }
    if (s === 2) {
      if (!state.isAnonim)
        return { ok: false, message: t("errPilihAnonim") };
      if (state.isAnonim === "Tidak" && !state.nama.trim())
        return { ok: false, message: t("errNamaWajib") };
    }
    if (s === 3) {
      if (state.masukan.trim().length < 10)
        return { ok: false, message: t("errMasukanMin") };
    }
    return { ok: true };
  };

  const goNext = () => {
    const check = canProceed(step);
    if (!check.ok) {
      setStatus({ kind: "error", message: check.message ?? "" });
      return;
    }
    setStatus({ kind: "idle" });
    setStep((s) => Math.min(STEPS.length, s + 1));
    requestAnimationFrame(() =>
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const goBack = () => {
    setStatus({ kind: "idle" });
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    setStatus({ kind: "submitting" });
    const finalRole =
      state.saudaraAdalah === "Other"
        ? state.saudaraOther.trim()
        : state.saudaraAdalah;
    const payload: SuggestionPayload = {
      saudaraAdalah: finalRole,
      fakultas: state.fakultas,
      prodi: state.prodi || undefined,
      isAnonim: state.isAnonim || "Tidak",
      nama: state.isAnonim === "Tidak" ? state.nama.trim() : undefined,
      nim: state.isAnonim === "Tidak" ? state.nim.trim() || undefined : undefined,
      masukan: state.masukan.trim(),
      kronologi: state.kronologi.trim() || undefined,
      kontak: state.kontak.trim() || undefined,
    };
    try {
      const res = await fetch("/api/saran", {
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
          message: data?.error ?? t("errKirim"),
        });
        return;
      }
      setStatus({ kind: "success" });
      setStep(5);
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? `${tCommon("couldNotConnect")} ${err.message}`
            : tCommon("couldNotConnect"),
      });
    }
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setStatus({ kind: "idle" });
    setStep(1);
  };

  if (step === 5)
    return (
      <SuccessScreen
        onReset={reset}
        state={state}
        t={t}
        tCommon={tCommon}
      />
    );

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-6 sm:mb-8">
        <ProgressSteps steps={STEPS} current={step} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-xl shadow-primary/5">
        <div
          key={step}
          className="animate-fade-in-up px-5 py-6 sm:px-8 sm:py-8"
        >
          {step === 1 ? (
            <StepTentangAnda
              state={state}
              update={update}
              setFakultas={setFakultas}
              units={units}
              selectedGroup={selectedGroup}
              t={t}
              tCommon={tCommon}
            />
          ) : null}
          {step === 2 ? (
            <StepPrivasi state={state} update={update} t={t} />
          ) : null}
          {step === 3 ? (
            <StepMasukan state={state} update={update} t={t} />
          ) : null}
          {step === 4 ? <StepTinjau state={state} t={t} /> : null}
        </div>

        {status.kind === "error" ? (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:mx-8">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 1 || status.kind === "submitting"}
            className="sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Button>
          {step < STEPS.length ? (
            <Button
              type="button"
              variant="gradient"
              onClick={goNext}
              size="lg"
              className="sm:w-auto"
            >
              {tCommon("next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="gradient"
              size="lg"
              onClick={submit}
              disabled={status.kind === "submitting"}
              className="sm:w-auto"
            >
              {status.kind === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCommon("submitting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("kirimMasukan")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
  icon,
  stepLabel,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  stepLabel: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        {icon}
        <span>{stepLabel}</span>
      </div>
      <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
    </div>
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
    <div className="space-y-7">
      <SectionTitle
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title={t("tentangTitle")}
        description={t("tentangDescr")}
        stepLabel={t("stepLabel")}
      />

      <div>
        <Label className="mb-3 block">
          {t("saudaraAdalah")} <span className="text-destructive">*</span>
        </Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map((role) => {
            const Icon = ROLE_ICONS[role] ?? Users;
            return (
              <OptionCard
                key={role}
                label={role}
                description={roleDescr(t, role)}
                icon={<Icon className="h-5 w-5" />}
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
    <div className="space-y-7">
      <SectionTitle
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        title={t("privasiTitle")}
        description={t("privasiDescr")}
        stepLabel={t("stepLabel")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <OptionCard
          label={t("withIdentitas")}
          description={t("withIdentitasDescr", {
            short: SITE_CONFIG.universityShort,
          })}
          icon={<Eye className="h-5 w-5" />}
          selected={state.isAnonim === "Tidak"}
          onClick={() => update("isAnonim", "Tidak")}
        />
        <OptionCard
          label={t("anonim")}
          description={t("anonimDescr")}
          icon={<EyeOff className="h-5 w-5" />}
          selected={state.isAnonim === "Ya"}
          onClick={() => update("isAnonim", "Ya")}
        />
      </div>

      {state.isAnonim === "Tidak" ? (
        <div className="animate-fade-in space-y-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
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
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] p-4 text-sm text-foreground sm:p-5">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
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
    <div className="space-y-7">
      <SectionTitle
        icon={<Send className="h-3.5 w-3.5" />}
        title={t("masukanTitle")}
        description={t("masukanDescr", {
          short: SITE_CONFIG.universityShort,
        })}
        stepLabel={t("stepLabel")}
      />

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

function StepTinjau({
  state,
  t,
}: {
  state: FormState;
  t: ReturnType<typeof useTranslations<"saranForm">>;
}) {
  const role =
    state.saudaraAdalah === "Other" ? state.saudaraOther : state.saudaraAdalah;
  const unitLabel = state.prodi
    ? `${state.fakultas} \u2014 ${state.prodi}`
    : state.fakultas;
  const items: Array<{ label: string; value?: string }> = [
    { label: t("label_saudaraAdalah"), value: role },
    { label: t("label_unit"), value: unitLabel },
    {
      label: t("label_mode"),
      value:
        state.isAnonim === "Ya"
          ? t("anonim")
          : t("identitasHeader"),
    },
  ];
  if (state.isAnonim === "Tidak") {
    items.push({ label: t("label_nama"), value: state.nama });
    if (state.nim) items.push({ label: t("label_nim"), value: state.nim });
  }
  items.push({ label: t("label_masukan"), value: state.masukan });
  if (state.kronologi)
    items.push({ label: t("label_kronologi"), value: state.kronologi });
  if (state.kontak)
    items.push({ label: t("label_kontak"), value: state.kontak });

  return (
    <div className="space-y-6">
      <SectionTitle
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        title={t("tinjauTitle")}
        description={t("tinjauDescr", {
          short: SITE_CONFIG.universityShort,
        })}
        stepLabel={t("stepLabel")}
      />

      <ul className="divide-y divide-border rounded-xl border border-border bg-background">
        {items.map((it) => (
          <li
            key={it.label}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4 sm:px-5"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {it.label}
            </span>
            <span className="whitespace-pre-wrap text-sm text-foreground">
              {it.value || "\u2014"}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/[0.07] p-4 text-sm text-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="text-muted-foreground">
          {t.rich("submitDisclaimer", {
            university: SITE_CONFIG.universityName,
            b: (chunks) => (
              <span className="font-medium text-foreground">{chunks}</span>
            ),
          })}
        </p>
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
    state.isAnonim === "Ya"
      ? t("successAnonymous")
      : state.nama || t("successYou");
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xl shadow-success/10 sm:p-12">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
        <PartyPopper className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
        {t("successTitle")}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-pretty text-muted-foreground">
        {t.rich("successDescr", {
          name,
          university: SITE_CONFIG.universityName,
          b: (chunks) => (
            <span className="font-medium text-foreground">{chunks}</span>
          ),
        })}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
        <Button onClick={onReset} variant="gradient" size="lg">
          <Send className="h-4 w-4" />
          {t("successKirimLain")}
        </Button>
        <Button asChild variant="outline" size="lg">
          <a href="/">
            <Home className="h-4 w-4" />
            {tCommon("backToHome")}
          </a>
        </Button>
      </div>
    </div>
  );
}
