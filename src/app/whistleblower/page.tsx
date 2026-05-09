import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { WhistleblowerForm } from "@/components/whistleblower-form";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata = {
  title: `Whistleblower — Lapor Pelanggaran · ${SITE_CONFIG.universityShort}`,
  description: `Saluran resmi pelaporan pelanggaran etik, korupsi, kekerasan, dan kecurangan akademik di ${SITE_CONFIG.universityName}.`,
};

export default function WhistleblowerPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -right-32 top-[10%] h-[420px] w-[420px] rounded-full bg-slate-500/10 blur-3xl" />
      </div>

      <header className="container flex items-center justify-between py-5 sm:py-6">
        <div className="flex items-center gap-3">
          <BrandMark size={42} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {SITE_CONFIG.universityName}
            </span>
            <span className="text-sm font-semibold text-foreground sm:text-base">
              Saluran Whistleblower
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Kotak saran
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-3xl pb-16 pt-2 sm:pt-4">
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-200">
          <ShieldAlert className="h-3.5 w-3.5" />
          Saluran resmi laporan pelanggaran
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Laporkan pelanggaran melalui jalur{" "}
          <span className="text-rose-600 dark:text-rose-400">whistleblower</span>
          .
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          Saluran ini khusus untuk melaporkan dugaan pelanggaran etik, korupsi,
          kekerasan/pelecehan, kecurangan akademik, dan pelanggaran tata tertib
          di lingkungan {SITE_CONFIG.universityName}. Identitas pelapor
          dilindungi.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Untuk masukan / saran perbaikan layanan biasa, silakan gunakan{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Kotak Saran Elektronik
          </Link>
          .
        </p>

        <div className="mt-8">
          <WhistleblowerForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
