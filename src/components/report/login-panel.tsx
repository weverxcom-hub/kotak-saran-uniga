"use client";

import * as React from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { SITE_CONFIG } from "@/lib/site-config";

type GoogleId = {
  initialize: (cfg: {
    client_id: string;
    callback: (r: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    use_fedcm_for_button?: boolean;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

export function LoginPanel({
  googleClientId,
  passwordEnabled,
  next,
}: {
  googleClientId: string | null;
  passwordEnabled: boolean;
  next: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("adminLogin");
  const tCommon = useTranslations("common");
  const tFooter = useTranslations("footer");

  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [gisState, setGisState] = React.useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const finishLogin = React.useCallback(() => {
    router.replace(next);
    router.refresh();
  }, [router, next]);

  const onGoogleCredential = React.useCallback(
    async (credential: string | undefined) => {
      if (!credential) {
        setError(t("errFail"));
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/report/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });
        if (res.ok) {
          finishLogin();
          return;
        }
        const data = (await res.json().catch(() => null)) as
          | { error?: string; code?: string }
          | null;
        setError(
          data?.code === "not_allowed" ? t("errNotAllowed") : data?.error ?? t("errFail"),
        );
      } catch {
        setError(tCommon("couldNotConnect"));
      } finally {
        setSubmitting(false);
      }
    },
    [finishLogin, t, tCommon],
  );

  const renderGoogleButton = React.useCallback(() => {
    const gis = window.google?.accounts?.id;
    if (!googleClientId || !gis || !buttonRef.current) return;
    gis.initialize({
      client_id: googleClientId,
      callback: (r) => void onGoogleCredential(r.credential),
      ux_mode: "popup",
      auto_select: false,
      use_fedcm_for_button: true,
    });
    buttonRef.current.innerHTML = "";
    gis.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.min(buttonRef.current.clientWidth || 320, 400),
      locale: locale === "en" ? "en" : "id",
    });
    setGisState("ready");
  }, [googleClientId, onGoogleCredential, locale]);

  // Script mungkin sudah termuat dari kunjungan sebelumnya (navigasi client).
  React.useEffect(() => {
    if (window.google?.accounts?.id) renderGoogleButton();
  }, [renderGoogleButton]);

  const onSubmitPassword = async (e: React.FormEvent<HTMLFormElement>) => {
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
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t("errFail"));
        return;
      }
      finishLogin();
    } catch {
      setError(tCommon("couldNotConnect"));
    } finally {
      setSubmitting(false);
    }
  };

  const nothingConfigured = !googleClientId && !passwordEnabled;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      {googleClientId ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={renderGoogleButton}
          onError={() => setGisState("failed")}
        />
      ) : null}

      <main className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("intro", { university: SITE_CONFIG.universityName })}
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-7">
          {googleClientId ? (
            <div>
              <p className="mb-4 text-sm text-foreground">{t("googleHint")}</p>
              <div ref={buttonRef} className="flex min-h-[44px] w-full justify-center" />
              {gisState === "loading" ? (
                <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("googleLoading")}
                </p>
              ) : null}
              {gisState === "failed" ? (
                <p className="mt-2 text-sm text-destructive">{t("errGoogleLoad")}</p>
              ) : null}
              {submitting ? (
                <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("btnLoading")}
                </p>
              ) : null}
            </div>
          ) : null}

          {passwordEnabled ? (
            <form
              onSubmit={onSubmitPassword}
              className={googleClientId ? "space-y-5 border-t border-border pt-5" : "space-y-5"}
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
            </form>
          ) : null}

          {nothingConfigured ? (
            <p className="text-sm text-muted-foreground">{t("notConfigured")}</p>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <p className="text-center text-xs text-muted-foreground">
            {t("footer", { short: SITE_CONFIG.universityShort })}
          </p>
        </div>

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
