import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
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
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="container max-w-5xl flex-1 pb-16 pt-8 sm:pt-12">
        <p className="eyebrow text-rose-700 dark:text-rose-300">{t("badge")}</p>
        <h1 className="mt-2 max-w-3xl text-balance text-3xl font-semibold text-foreground sm:text-4xl">
          {t.rich("title", {
            wb: (chunks) => (
              <span className="italic text-rose-700 dark:text-rose-300">{chunks}</span>
            ),
          })}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">
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

        <div className="mt-10 max-w-3xl">
          <WhistleblowerForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
