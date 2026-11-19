"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { SITE_CONFIG } from "@/lib/site-config";

export default function ReportLoginPage() {
  return (
    <React.Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginSkeleton() {
  const tCommon = useTranslations("common");
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      {tCommon("loading")}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("adminLogin");
  const tCommon = useTranslations("common");
  const tFooter = useTranslations("footer");
  const next = searchParams.get("next") || "/report";
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/report/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? t("errFail"));
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tCommon("couldNotConnect"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">

      <main className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("intro", { university: SITE_CONFIG.universityName })}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-7"
        >
          <div>
            <Label htmlFor="report-password" className="mb-2 block">
              {t("passwordLabel")}
            </Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="report-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                required
                className="pl-9"
                disabled={submitting}
              />
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={submitting || password.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("btnLoading")}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                {t("btn")}
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t("footer", { short: SITE_CONFIG.universityShort })}
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tFooter("credit")}{" "}
          <a
            href="https://weverx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            weverx.com
          </a>
        </p>
      </main>
    </div>
  );
}
