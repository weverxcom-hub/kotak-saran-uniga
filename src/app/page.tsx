import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";

export default function Home() {
  const t = useTranslations("home");
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        {/* Pembuka: rata kiri, tanpa dekorasi. Menjawab "ini apa" dan "siapa yang membaca". */}
        <section className="container max-w-5xl pb-10 pt-10 sm:pb-14 sm:pt-16">
          <p className="eyebrow">
            {t("eyebrow", { university: SITE_CONFIG.universityName })}
          </p>
          <h1 className="mt-3 max-w-3xl text-balance text-[2rem] font-semibold leading-[1.15] text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t("intro")}
          </p>
        </section>

        {/* Dua saluran sebagai dua kolom bergaris, bukan kartu bergradasi. */}
        <section
          aria-label={t("chooserAria")}
          className="container max-w-5xl"
        >
          <div className="grid border-y border-border md:grid-cols-2">
            <Channel
              href="/saran"
              number="01"
              title={t("saranTitle")}
              description={t("saranDescr")}
              example={t("saranExample")}
              cta={t("saranCta")}
            />
            <Channel
              href="/whistleblower"
              number="02"
              title={t("wbTitle")}
              subtitle={t("wbSub")}
              description={t("wbDescr")}
              example={t("wbExample")}
              cta={t("wbCta")}
              tone="alert"
              className="border-t border-border md:border-l md:border-t-0"
            />
          </div>
        </section>

        <section className="container max-w-5xl py-14 sm:py-20">
          <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:gap-16">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {t("afterTitle")}
              </h2>
              <ol className="mt-6 space-y-6">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="grid grid-cols-[2rem_1fr] gap-x-3">
                    <span className="font-serif text-lg font-semibold leading-6 text-accent">
                      {n}.
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {t(`after${n}Title` as "after1Title")}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {t(`after${n}Descr` as "after1Descr")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {t("privacyTitle")}
              </h2>
              <dl className="mt-6 divide-y divide-border border-y border-border">
                <div className="py-4">
                  <dt className="font-semibold text-foreground">
                    {t("privacyAnonTitle")}
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    {t("privacyAnonDescr")}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="font-semibold text-foreground">
                    {t("privacyNamedTitle")}
                  </dt>
                  <dd className="mt-1 text-muted-foreground">
                    {t("privacyNamedDescr")}
                  </dd>
                </div>
              </dl>

              {/* Lacak langsung dari beranda: satu kolom isian, tanpa pindah halaman dulu. */}
              <form action="/lacak" method="get" className="mt-10">
                <h3 className="text-lg font-semibold text-foreground">
                  {t("lacakTitle")}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("lacakDescr")}
                </p>
                <label htmlFor="home-case-id" className="sr-only">
                  {t("lacakLabel")}
                </label>
                <div className="mt-3 flex gap-2">
                  <input
                    id="home-case-id"
                    name="caseId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="WB-20261119-7KQ4M2XP"
                    className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 font-mono text-sm uppercase placeholder:normal-case placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    className="h-11 shrink-0 rounded-md border border-foreground/80 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    {t("lacakCta")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Channel({
  href,
  number,
  title,
  subtitle,
  description,
  example,
  cta,
  tone = "default",
  className = "",
}: {
  href: string;
  number: string;
  title: string;
  subtitle?: string;
  description: string;
  example: string;
  cta: string;
  tone?: "default" | "alert";
  className?: string;
}) {
  const ctaClass =
    tone === "alert"
      ? "bg-rose-700 text-white hover:bg-rose-800 dark:bg-rose-300 dark:text-rose-950 dark:hover:bg-rose-200"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  return (
    <div className={`flex flex-col py-8 md:px-8 md:first:pl-0 md:last:pr-0 ${className}`}>
      <p className="font-mono text-xs text-muted-foreground">{number}</p>
      <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-[1.75rem]">
        {title}
        {subtitle ? (
          <span className="ml-2 align-middle font-sans text-sm font-normal text-muted-foreground">
            ({subtitle})
          </span>
        ) : null}
      </h2>
      <p className="mt-3 text-pretty text-foreground/85">{description}</p>
      <p className="mt-3 text-pretty text-sm text-muted-foreground">{example}</p>
      <div className="mt-auto pt-6">
        <Link
          href={href}
          className={`inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors ${ctaClass}`}
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
