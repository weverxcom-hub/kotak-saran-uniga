import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sederhana, signed cookie session untuk halaman /report.
 *
 * - Tidak butuh database / Redis / iron-session.
 * - Cookie body = "<expiresAt>.<hmac(expiresAt)>" yang ditandatangani
 *   menggunakan REPORT_SESSION_SECRET (atau REPORT_PASSWORD sebagai fallback).
 * - Verifikasi konstan-waktu untuk mencegah timing attack.
 */

const SESSION_COOKIE = "kotak-saran-session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 8; // 8 jam

function getSecret(): string {
  const secret =
    process.env.REPORT_SESSION_SECRET ||
    process.env.REPORT_PASSWORD ||
    "kotak-saran-dev-secret-change-me";
  return secret;
}

function sign(message: string): string {
  return createHmac("sha256", getSecret()).update(message).digest("base64url");
}

export function createSessionToken(ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const message = String(expiresAt);
  const signature = sign(message);
  return `${message}.${signature}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [message, signature] = token.split(".");
  if (!message || !signature) return false;
  const expectedSignature = sign(message);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  const expiresAt = Number(message);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Math.floor(Date.now() / 1000);
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
