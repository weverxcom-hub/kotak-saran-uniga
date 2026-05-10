import "server-only";

import { cookies } from "next/headers";

/**
 * Bilingual ID/EN tanpa prefix URL (`/en`, `/id`). Kita pilih bahasa cuma lewat
 * cookie supaya rute publik (`/saran`, `/whistleblower`, `/lacak`, dst.) tetap
 * persis seperti sebelumnya — link lama tidak rusak, SEO tidak terpecah, dan
 * admin tidak perlu bookmark ulang. Default = Indonesia. Toggle bahasa di
 * navbar tinggal set cookie & reload.
 */

export const SUPPORTED_LOCALES = ["id", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";

/** Nama cookie. Pendek tapi explicit supaya tidak nabrak cookie lain. */
export const LOCALE_COOKIE = "ksu_locale";

/**
 * Umur cookie 1 tahun — sengaja panjang karena pilihan bahasa pengguna jarang
 * berubah dan tidak ada alasan keamanan untuk expire cepat.
 */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/** Baca locale aktif dari cookie. Fallback ke default kalau invalid/missing. */
export function getLocaleFromCookies(): Locale {
  const c = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}
