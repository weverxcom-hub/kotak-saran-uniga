import Link from "next/link";
import { SaranForm } from "@/components/saran-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import {
  ShieldCheck,
  Sparkles,
  MessageSquareHeart,
  Lock,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-[10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl animate-blob [animation-delay:-7s]" />
        <div className="absolute left-1/4 top-[50%] h-[380px] w-[380px] rounded-full bg-success/10 blur-3xl animate-blob [animation-delay:-3s]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40"
      />

      <header className="container flex items-center justify-between py-5 sm:py-6">
        <div className="flex items-center gap-3">
          <BrandMark size={42} />
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              FEB Universitas Gajayana Malang
            </span>
            <span className="text-sm font-semibold text-foreground">
              Kotak Saran Elektronik
            </span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="container pb-16 pt-4 sm:pb-24 sm:pt-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* Left: hero */}
          <section className="flex flex-col justify-center space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Versi modern dari kotak saran resmi
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Suarakan masukan Anda untuk{" "}
              <span className="gradient-text">FEB UNIGA Malang</span>.
            </h1>
            <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              Kotak Saran Elektronik resmi Fakultas Ekonomi dan Bisnis Universitas
              Gajayana Malang. Sampaikan masukan, saran, kritik, atau keluhan
              terhadap layanan akademik, non-akademik, dan sarana prasarana
              pendukung. Identitas Anda dijamin kerahasiaannya.
            </p>

            <div className="grid gap-3 sm:max-w-md">
              <Highlight
                icon={<MessageSquareHeart className="h-4 w-4" />}
                title="Setiap masukan dikaji oleh tim FEB"
                description="Bahan dasar perbaikan kualitas layanan."
              />
              <Highlight
                icon={<Lock className="h-4 w-4" />}
                title="Opsi anonim sepenuhnya"
                description="Sampaikan kritik tanpa khawatir identitas terungkap."
              />
              <Highlight
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Kerahasiaan terjamin"
                description="Tersimpan aman; akses dibatasi internal FEB UNIGA."
              />
            </div>

            <Link
              href="/whistleblower"
              className="group inline-flex items-center gap-2 self-start rounded-xl border border-rose-300/60 bg-rose-50/80 px-4 py-2.5 text-sm font-medium text-rose-800 transition hover:border-rose-400 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Lapor pelanggaran serius (Whistleblower)</span>
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </section>

          {/* Right: form */}
          <section
            id="form"
            className="lg:scroll-mt-24"
            aria-label="Formulir Kotak Saran"
          >
            <SaranForm />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Highlight({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-3.5 backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
