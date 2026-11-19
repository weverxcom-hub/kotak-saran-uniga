import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";
import {
  googleClientId,
  googleLoginEnabled,
  isAdminEmail,
} from "@/lib/admin-access";
import { rateLimited } from "@/lib/api-response";
import { RULES } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifier = new OAuth2Client();

/**
 * Menerima ID token dari tombol "Sign in with Google" (Google Identity
 * Services), memverifikasi tanda tangan & audience-nya di server, lalu
 * hanya membuat sesi kalau email ada di REPORT_ADMIN_EMAILS.
 */
export async function POST(req: Request) {
  const limited = rateLimited(req, RULES.login);
  if (limited) return limited;

  const clientId = googleClientId();
  if (!googleLoginEnabled() || !clientId) {
    return NextResponse.json(
      { error: "Login Google belum dikonfigurasi." },
      { status: 404 },
    );
  }

  let credential = "";
  try {
    const body = (await req.json()) as { credential?: unknown };
    if (typeof body?.credential === "string") credential = body.credential;
  } catch {
    // ditangani di bawah
  }
  if (!credential || credential.length > 8192) {
    return NextResponse.json({ error: "Token Google tidak ada." }, { status: 400 });
  }

  let email: string | undefined;
  let verified = false;
  try {
    const ticket = await verifier.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    email = payload?.email;
    verified = payload?.email_verified === true;
  } catch (err) {
    console.warn("[google-login] token ditolak:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Token Google tidak valid. Coba lagi." },
      { status: 401 },
    );
  }

  if (!email || !verified || !isAdminEmail(email)) {
    console.warn("[google-login] akun tidak diizinkan:", email ?? "(tanpa email)");
    return NextResponse.json(
      { error: "Akun Google ini tidak terdaftar sebagai pengelola.", code: "not_allowed" },
      { status: 403 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, createSessionToken(email), SESSION_COOKIE_OPTIONS);
  return res;
}
