/**
 * Site-wide branding & metadata. Single source of truth supaya satu kampus =
 * satu deploy = satu set env / kode. Semua nilai bisa di-override lewat env
 * var (server-side maupun NEXT_PUBLIC_* untuk client) supaya bisa redeploy
 * untuk kampus lain tanpa edit kode.
 *
 * Default-nya diisi untuk Universitas Gajayana Malang (UNIGA) — versi
 * tingkat universitas penuh, bukan hanya fakultas.
 */

const env = (key: string): string | undefined => {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
};

export const SITE_CONFIG = {
  /** Nama panjang universitas (dipakai di metadata, footer, dst). */
  universityName:
    env("NEXT_PUBLIC_UNIVERSITY_NAME") ?? "Universitas Gajayana Malang",
  /** Singkatan / alias pendek (untuk header & breadcrumb). */
  universityShort: env("NEXT_PUBLIC_UNIVERSITY_SHORT") ?? "UNIGA Malang",
  /** Tagline singkat di hero / OG. */
  tagline:
    env("NEXT_PUBLIC_SITE_TAGLINE") ??
    "Kotak Saran Elektronik tingkat universitas",
  /** URL situs resmi kampus (footer link & meta). */
  websiteUrl: env("NEXT_PUBLIC_UNIVERSITY_URL") ?? "https://unigamalang.ac.id",
  /** Email pengelola untuk follow-up whistleblower & kontak admin. */
  contactEmail:
    env("NEXT_PUBLIC_CONTACT_EMAIL") ?? "humas@unigamalang.ac.id",
  /** Path logo (di /public). PNG/SVG/WebP — yang penting eksis. */
  logoPath: env("NEXT_PUBLIC_LOGO_PATH") ?? "/img/uniga-logo.png",
  /** Path logo high-res untuk OpenGraph / preview share. */
  logoOgPath:
    env("NEXT_PUBLIC_LOGO_OG_PATH") ?? "/img/uniga-logo@2x.png",
  /** Alt text logo (untuk a11y). */
  logoAlt:
    env("NEXT_PUBLIC_LOGO_ALT") ?? "Logo Universitas Gajayana Malang",
} as const;

export type SiteConfig = typeof SITE_CONFIG;
