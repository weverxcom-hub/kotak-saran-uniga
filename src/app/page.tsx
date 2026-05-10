import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SITE_CONFIG } from "@/lib/site-config";
import {
  ShieldCheck,
  Sparkles,
  MessageSquareHeart,
  Lock,
  ShieldAlert,
  ArrowRight,
  Search,
  EyeOff,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute -right-32 top-[10%] h-[420px] w-[420px] rounded-full bg-accent/20 blur-3xl animate-blob [animation-delay:-7s]" />
        <div className="absolute left-1/4 top-[55%] h-[380px] w-[380px] rounded-full bg-rose-500/10 blur-3xl animate-blob [animation-delay:-3s]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40"
      />

      <SiteNav />

      <main className="container flex-1 pb-16 pt-10 sm:pb-20 sm:pt-14">
        {/* Hero / intro */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground dark:bg-accent/20 dark:text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            {SITE_CONFIG.tagline}
          </div>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Suarakan masukan Anda untuk{" "}
            <span className="gradient-text">{SITE_CONFIG.universityShort}</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Pilih saluran yang sesuai. Saran &amp; kritik untuk masukan
            layanan, atau Whistleblower untuk laporan pelanggaran serius.
            Identitas Anda dijaga &mdash; opsi anonim tersedia di kedua jalur.
          </p>
        </section>

        {/* Two-card chooser */}
        <section
          aria-label="Pilih saluran"
          className="mt-10 grid gap-5 sm:mt-12 lg:grid-cols-2 lg:gap-7"
        >
          {/* Saran & Kritik */}
          <Link
            href="/saran"
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 shadow-sm ring-1 ring-inset ring-white/5 transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 sm:p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-80"
            />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <MessageSquareHeart className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Untuk umum
              </span>
            </div>
            <h2 className="relative mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Saran &amp; Kritik
            </h2>
            <p className="relative mt-2 text-sm text-muted-foreground sm:text-base">
              Sampaikan masukan terhadap layanan akademik, non-akademik, dan
              sarana prasarana di seluruh fakultas &amp; unit{" "}
              {SITE_CONFIG.universityShort}.
            </p>
            <ul className="relative mt-5 space-y-2 text-sm text-foreground/90">
              <CardBullet>Cocok untuk apresiasi, kritik, &amp; usulan perbaikan</CardBullet>
              <CardBullet>Identitas atau anonim &mdash; pilih sesuai kenyamanan</CardBullet>
              <CardBullet>Wajib pilih fakultas / prodi yang relevan</CardBullet>
            </ul>
            <div className="relative mt-auto pt-7">
              <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition group-hover:gap-3">
                Kirim saran
                <ArrowRight className="h-4 w-4 transition" />
              </span>
            </div>
          </Link>

          {/* Whistleblower */}
          <Link
            href="/whistleblower"
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-rose-300/40 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-6 shadow-sm ring-1 ring-inset ring-white/5 transition hover:border-rose-400/60 hover:shadow-lg hover:shadow-rose-500/10 dark:border-rose-500/30 sm:p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-rose-500/20 blur-3xl transition-opacity group-hover:opacity-80"
            />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm dark:bg-rose-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-rose-300/50 bg-rose-100/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
                Saluran khusus
              </span>
            </div>
            <h2 className="relative mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Whistleblower
            </h2>
            <p className="relative mt-2 text-sm text-muted-foreground sm:text-base">
              Laporkan dugaan pelanggaran serius: korupsi/gratifikasi,
              kekerasan / pelecehan, kecurangan akademik, konflik
              kepentingan, atau pelanggaran tata tertib pegawai.
            </p>
            <ul className="relative mt-5 space-y-2 text-sm text-foreground/90">
              <CardBullet>Default anonim aktif &mdash; identitas opsional</CardBullet>
              <CardBullet>Setiap laporan dapat Case ID untuk follow-up</CardBullet>
              <CardBullet>Akses laporan dibatasi internal pengelola</CardBullet>
            </ul>
            <div className="relative mt-auto pt-7">
              <span className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition group-hover:gap-3 dark:bg-rose-500">
                Lapor pelanggaran
                <ArrowRight className="h-4 w-4 transition" />
              </span>
            </div>
          </Link>
        </section>

        {/* Trust strip */}
        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          <Highlight
            icon={<EyeOff className="h-4 w-4" />}
            title="Opsi anonim"
            description="Tersedia di kedua saluran tanpa tracking IP."
          />
          <Highlight
            icon={<Lock className="h-4 w-4" />}
            title="Tersimpan aman"
            description={`Hanya pengelola ${SITE_CONFIG.universityShort} yang dapat membaca.`}
          />
          <Highlight
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Tindak lanjut transparan"
            description="Status & catatan publik dapat dilacak via Case ID."
          />
        </section>

        {/* Lacak Case ID quick CTA */}
        <section className="mt-8 rounded-2xl border border-border bg-card/60 p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent dark:text-accent">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground sm:text-base">
                Sudah pernah lapor whistleblower?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Lacak status laporan Anda dengan Case ID yang Anda terima
                setelah submit.
              </p>
            </div>
          </div>
          <Link
            href="/lacak"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/60 sm:mt-0 sm:shrink-0"
          >
            <Search className="h-4 w-4" />
            Lacak Case ID
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function CardBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60"
      />
      <span>{children}</span>
    </li>
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
