"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Top navigation bar yang sticky di seluruh halaman publik. Layout-nya
 * mengikuti pola navbar kampus pada umumnya: brand kiri, item navigasi
 * tengah/kanan, tombol login admin di paling kanan. Mobile pakai
 * hamburger menu yang slide ke bawah.
 *
 * Single source of truth daftar menu ada di `NAV_ITEMS` agar konsisten
 * antar halaman. Item "Login Admin" sengaja dipisah supaya bisa diberi
 * styling outline button di desktop.
 */

type NavItem = { href: string; label: string };

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/", label: "Beranda" },
  { href: "/saran", label: "Saran & Kritik" },
  { href: "/whistleblower", label: "Whistleblower" },
  { href: "/lacak", label: "Lacak Case ID" },
];

export function SiteNav() {
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center gap-3 sm:h-16">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
        >
          <BrandMark size={36} />
          <div className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {SITE_CONFIG.universityName}
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {SITE_CONFIG.siteName}
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground sm:hidden">
            {SITE_CONFIG.siteName}
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="ml-auto hidden items-center gap-1 lg:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
                isActive(item.href) &&
                  "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <ThemeToggle />
          <Link
            href="/report/login"
            className="hidden lg:inline-flex"
            aria-label="Login admin"
          >
            <Button type="button" variant="outline" size="sm">
              <LogIn className="h-4 w-4" />
              Login Admin
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="site-nav-mobile"
          >
            {open ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="site-nav-mobile"
        className={cn(
          "lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav
          aria-label="Navigasi utama (mobile)"
          className="container flex flex-col gap-1 border-t border-border/60 py-3"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2.5 text-sm font-medium transition",
                isActive(item.href)
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/report/login"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60"
          >
            <LogIn className="h-4 w-4" />
            Login Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
