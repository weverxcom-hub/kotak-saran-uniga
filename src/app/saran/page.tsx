import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { SaranForm } from "@/components/saran-form";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("saranTitle"),
    description: t("saranDesc", { university: SITE_CONFIG.universityName }),
  };
}

export default function SaranPage() {
  const t = useTranslations("saranPage");
  const tCommon = useTranslations("common");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="container max-w-5xl flex-1 pb-16 pt-8 sm:pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {tCommon("backToHome")}
        </Link>

        <p className="eyebrow mt-8">{t("channelLabel")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg">
          {t("intro", { short: SITE_CONFIG.universityShort })}
        </p>

        <section id="form" className="mt-10" aria-label={t("formAria")}>
          <SaranForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
