"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Top navigation bar yang sticky di seluruh halaman publik. Layout-nya
 * mengikuti pola navbar kampus pada umumnya: brand kiri, item navigasi
 * tengah/kanan, tombol login admin di paling kanan. Mobile pakai
 * hamburger menu yang slide ke bawah.
 *
 * Daftar menu di-resolve di dalam komponen via `useTranslations` supaya
 * label otomatis ikut bahasa aktif (cookie `ksu_locale`).
 */

const NAV_HREFS = ["/", "/saran", "/whistleblower", "/lacak"] as const;
type NavHref = (typeof NAV_HREFS)[number];
const NAV_KEY: Record<NavHref, "home" | "saran" | "whistleblower" | "lacak"> = {
  "/": "home",
  "/saran": "saran",
  "/whistleblower": "whistleblower",
  "/lacak": "lacak",
};

export function SiteNav() {
  const t = useTranslations("nav");
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = React.useState(false);

  // Close menu on route change.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      {/* Garis emas tipis: penanda identitas UNIGA, seperti kop surat. */}
      <div aria-hidden className="h-1 bg-accent" />
      <div className="container flex h-16 max-w-5xl items-center gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandMark size={34} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-serif text-[1.05rem] font-semibold text-foreground">
              {SITE_CONFIG.siteName}
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {SITE_CONFIG.universityName}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("main")}
          className="ml-auto hidden items-center gap-6 lg:flex"
        >
          {NAV_HREFS.filter((h) => h !== "/").map((href) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "border-b-2 py-1 text-sm font-medium transition-colors",
                isActive(href)
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(NAV_KEY[href])}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted lg:hidden"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            aria-controls="site-nav-mobile"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu HP: tautan besar + pilihan bahasa & tema di bawahnya. */}
      <div id="site-nav-mobile" className={cn("lg:hidden", open ? "block" : "hidden")}>
        <nav
          aria-label={t("mainMobile")}
          className="container flex max-w-5xl flex-col border-t border-border pb-4"
        >
          {NAV_HREFS.map((href) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "border-b border-border py-3 text-base",
                isActive(href) ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {t(NAV_KEY[href])}
            </Link>
          ))}
          <div className="mt-4 flex items-center gap-3 sm:hidden">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
