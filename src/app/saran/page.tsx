import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquareHeart } from "lucide-react";
import { SaranForm } from "@/components/saran-form";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Kirim Saran & Kritik",
  description: `Sampaikan saran, kritik, atau apresiasi terhadap layanan ${SITE_CONFIG.universityName}.`,
};

export default function SaranPage() {
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

      <main className="container flex-1 pb-16 pt-8 sm:pb-20 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke beranda
          </Link>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <MessageSquareHeart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saluran umum
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Kirim Saran &amp; Kritik
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Masukan Anda akan dikaji oleh tim {SITE_CONFIG.universityShort} sebagai
            bahan perbaikan kualitas layanan akademik, non-akademik, dan
            sarana prasarana di seluruh fakultas &amp; unit. Identitas Anda
            dijaga &mdash; opsi anonim tersedia.
          </p>

          <section
            id="form"
            className="mt-6 sm:mt-8"
            aria-label="Formulir Saran &amp; Kritik"
          >
            <SaranForm />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
