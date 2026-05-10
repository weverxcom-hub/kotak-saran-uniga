import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WhistleblowerForm } from "@/components/whistleblower-form";
import { SITE_CONFIG } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("whistleblowerTitle"),
    description: t("whistleblowerDesc", {
      university: SITE_CONFIG.universityName,
    }),
  };
}

export default function WhistleblowerPage() {
  const t = useTranslations("whistleblowerPage");
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -right-32 top-[10%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-3xl" />
      </div>

      <SiteNav />

      <main className="container max-w-3xl flex-1 pb-16 pt-6 sm:pt-10">
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-200">
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t.rich("title", {
            wb: (chunks) => (
              <span className="text-rose-600 dark:text-rose-400">{chunks}</span>
            ),
          })}
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {t("intro", { university: SITE_CONFIG.universityName })}
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("altLine_pre")}
          <Link
            href="/saran"
            className="font-medium text-primary hover:underline"
          >
            {t("altLine_saran")}
          </Link>
          {t("altLine_mid")}
          <Link
            href="/lacak"
            className="font-medium text-primary hover:underline"
          >
            {t("altLine_lacak")}
          </Link>
          {t("altLine_post")}
        </p>

        <div className="mt-8">
          <WhistleblowerForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
