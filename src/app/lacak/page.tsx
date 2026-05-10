import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LacakClient } from "@/components/lacak-client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("lacakTitle"),
    description: t("lacakDesc", { short: SITE_CONFIG.universityShort }),
  };
}

export default function LacakPage({
  searchParams,
}: {
  searchParams?: { caseId?: string };
}) {
  const initialCaseId = searchParams?.caseId?.trim() ?? "";
  const t = useTranslations("lacak");
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-[10%] h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl animate-blob [animation-delay:-7s]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30"
      />

      <SiteNav />

      <main className="container flex-1 pb-16 pt-10 sm:pb-20 sm:pt-14">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("section")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {t.rich("intro", {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>

          <div className="mt-6 sm:mt-8">
            <LacakClient initialCaseId={initialCaseId} />
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t("lupaTitle")}</p>
            <p className="mt-1">
              {t.rich("lupaDescr", {
                code: (chunks) => (
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    {chunks}
                  </code>
                ),
                emailLink: () => (
                  <a
                    href={`mailto:${SITE_CONFIG.contactEmail}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {SITE_CONFIG.contactEmail}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
