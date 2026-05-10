import { NextResponse } from "next/server";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
} from "@/i18n/locale";

export const dynamic = "force-dynamic";

/**
 * Set cookie locale lewat POST { locale: "id" | "en" }. Endpoint kecil
 * sengaja dipisah dari Server Action karena Server Action butuh form
 * boundary; pakai fetch dari LanguageToggle lebih ringan & gampang
 * di-test. Setelah cookie di-set, client-side reload halaman supaya
 * `getRequestConfig` (server) memuat ulang messages locale baru.
 */
export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const locale = (body as { locale?: unknown } | null)?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json(
      { error: "Unsupported locale." },
      { status: 400 },
    );
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
