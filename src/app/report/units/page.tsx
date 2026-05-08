import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Inbox, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { UnitsManager } from "@/components/report/units-manager";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { SITE_CONFIG } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Kelola Unit / Prodi — ${SITE_CONFIG.universityShort}`,
  description: `Kelola daftar fakultas dan program studi yang tampil di form Kotak Saran ${SITE_CONFIG.universityName}.`,
};

export default function ReportUnitsPage() {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(session)) {
    redirect("/report/login?next=/report/units");
  }
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 top-[10%] h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="container flex items-center justify-between py-5 sm:py-6">
        <div className="flex items-center gap-3">
          <BrandMark size={42} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {SITE_CONFIG.universityName}
            </span>
            <span className="text-sm font-semibold text-foreground sm:text-base">
              Kelola Unit / Prodi
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/report"
            className="hidden items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke rekap
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container pb-16 pt-2">
        {/* Tabs */}
        <nav className="mb-5 flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card/60 p-1 text-sm">
          <Link
            href="/report"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Inbox className="h-4 w-4" />
            Kotak Saran
          </Link>
          <Link
            href="/report/whistleblower"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ShieldAlert className="h-4 w-4" />
            Whistleblower
          </Link>
          <span
            aria-current="page"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground shadow-sm"
          >
            <Building2 className="h-4 w-4" />
            Unit / Prodi
          </span>
        </nav>

        <UnitsManager />
      </main>

      <SiteFooter variant="compact" />
    </div>
  );
}
