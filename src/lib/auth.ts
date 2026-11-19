import { createHmac, timingSafeEqual } from "node:crypto";
import { isAdminEmail, passwordLoginEnabled } from "@/lib/admin-access";

/**
 * Signed cookie session untuk halaman /report.
 *
 * - Tidak butuh database / Redis / iron-session.
 * - Cookie = "v2.<expiresAt>.<email base64url atau '-'>.<hmac>", ditandatangani
 *   dengan REPORT_SESSION_SECRET (atau REPORT_PASSWORD sebagai cadangan).
 *   Email "-" berarti sesi dari login password.
 * - Setiap pemeriksaan mengecek ulang daftar REPORT_ADMIN_EMAILS, jadi
 *   menghapus email dari daftar (lalu redeploy) langsung mencabut aksesnya.
 * - Verifikasi konstan-waktu untuk mencegah timing attack.
 */

const SESSION_COOKIE = "kotak-saran-session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 8; // 8 jam
const VERSION = "v2";
const PASSWORD_SUBJECT = "-";

function getSecret(): string {
  const secret = process.env.REPORT_SESSION_SECRET || process.env.REPORT_PASSWORD;
  if (secret) return secret;
  // Rahasia bawaan hanya boleh dipakai saat development lokal. Di produksi
  // lebih baik login gagal daripada cookie bisa dipalsukan.
  if (process.env.NODE_ENV === "production") {
    throw new Error("REPORT_SESSION_SECRET / REPORT_PASSWORD belum di-set.");
  }
  return "kotak-saran-dev-secret-change-me";
}

function sign(message: string): string {
  return createHmac("sha256", getSecret()).update(message).digest("base64url");
}

/** email = null untuk sesi dari login password. */
export function createSessionToken(
  email: string | null,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const subject = email
    ? Buffer.from(email.trim().toLowerCase()).toString("base64url")
    : PASSWORD_SUBJECT;
  const message = `${VERSION}.${expiresAt}.${subject}`;
  return `${message}.${sign(message)}`;
}

type Session = { email: string | null };

export function readSession(token: string | undefined): Session | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) return null;
  const [, exp, subject, signature] = parts;
  const message = `${VERSION}.${exp}.${subject}`;
  let expected: string;
  try {
    expected = sign(message);
  } catch {
    return null;
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  if (subject === PASSWORD_SUBJECT) {
    // Sesi password ikut mati begitu login password dinonaktifkan.
    return passwordLoginEnabled() ? { email: null } : null;
  }
  const email = Buffer.from(subject, "base64url").toString("utf8");
  return isAdminEmail(email) ? { email } : null;
}

export function verifySessionToken(token: string | undefined): boolean {
  return readSession(token) !== null;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.REPORT_PASSWORD;
  if (!expected) return false;
  if (input.length === 0) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DEFAULT_TTL_SECONDS,
};
