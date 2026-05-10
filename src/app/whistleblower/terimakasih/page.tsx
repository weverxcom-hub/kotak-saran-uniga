import Link from "next/link";
import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CaseIdCopy } from "@/components/case-id-copy";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata = {
  title: "Laporan Diterima — Whistleblower",
  description: "Laporan whistleblower berhasil dikirim. Simpan Case ID Anda.",
};

export const dynamic = "force-dynamic";

export default function WhistleblowerThankYouPage({
  searchParams,
}: {
  searchParams: { case?: string };
}) {
  const caseId = searchParams.case ?? "(tidak tersedia)";
  const isValidId = /^WB-\d{8}-[A-Z0-9]{4}$/.test(caseId);
  const lacakHref = isValidId
    ? `/lacak?caseId=${encodeURIComponent(caseId)}`
    : "/lacak";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <SiteNav />

      <main className="container max-w-2xl flex-1 pb-16 pt-6 sm:pt-10">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-6 dark:bg-emerald-500/10 sm:p-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Laporan berhasil dikirim
            </h1>
          </div>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Terima kasih atas keberanian Anda melaporkan dugaan pelanggaran.
            Tim Komisi Etik / SPI {SITE_CONFIG.universityShort} akan
            menindaklanjuti laporan ini sesuai prosedur. Identitas pelapor
            (jika diisi) dijaga kerahasiaannya.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Case ID Anda
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <code className="text-lg font-bold tracking-wider text-foreground sm:text-xl">
                {caseId}
              </code>
              {isValidId ? <CaseIdCopy caseId={caseId} /> : null}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              <strong>Simpan Case ID ini.</strong> Anda dapat memantau status
              laporan kapan saja di halaman{" "}
              <Link
                href={lacakHref}
                className="font-medium text-primary hover:underline"
              >
                Lacak Case ID
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p>
              Laporan Anda tersimpan di sistem internal{" "}
              {SITE_CONFIG.universityName} dan hanya dapat diakses oleh tim
              yang berwenang menangani whistleblower. Tidak ada notifikasi
              otomatis dikirim ke pihak lain.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={lacakHref}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              Lacak status sekarang
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
