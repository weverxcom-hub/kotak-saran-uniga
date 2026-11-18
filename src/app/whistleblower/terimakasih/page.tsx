import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CaseIdCopy } from "@/components/case-id-copy";
import { SITE_CONFIG } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("terimakasihTitle"),
    description: t("terimakasihDesc"),
  };
}

export const dynamic = "force-dynamic";

export default function WhistleblowerThankYouPage({
  searchParams,
}: {
  searchParams: { case?: string };
}) {
  const t = useTranslations("terimakasih");
  const tCommon = useTranslations("common");
  const caseId = searchParams.case ?? t("unavailable");
  const isValidId = /^WB-\d{8}-[A-Z0-9]{4,8}$/.test(caseId);
  const lacakHref = isValidId
    ? `/lacak?caseId=${encodeURIComponent(caseId)}`
    : "/lacak";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="container max-w-5xl flex-1 pb-16 pt-8 sm:pt-12">
        <div className="max-w-2xl border-t-4 border-success bg-card px-6 py-8 sm:px-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-success" aria-hidden />
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              {t("title")}
            </h1>
          </div>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {t("intro", { short: SITE_CONFIG.universityShort })}
          </p>

          <div className="mt-6 rounded-md border border-border bg-background p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("caseIdYou")}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <code className="font-mono text-xl font-semibold tracking-wider text-foreground sm:text-2xl">
                {caseId}
              </code>
              {isValidId ? <CaseIdCopy caseId={caseId} /> : null}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t.rich("saveCaseIdPre", {
                b: (chunks) => <strong>{chunks}</strong>,
              })}
              <Link
                href={lacakHref}
                className="font-medium text-primary hover:underline"
              >
                {t("saveCaseIdLink")}
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <p>{t("savedNote", { university: SITE_CONFIG.universityName })}</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={lacakHref}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              {t("trackNow")}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {tCommon("backToHome")}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
