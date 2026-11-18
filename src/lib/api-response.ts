import { NextResponse } from "next/server";
import { SheetsConfigError } from "@/lib/sheets";
import { checkRateLimit, clientIp, type RateLimitRule } from "@/lib/rate-limit";

/**
 * Balasan error yang aman untuk publik: detail teknis (pesan Google API,
 * nama env var) hanya dicatat di log server, tidak dikirim ke browser.
 */
export function serverError(
  err: unknown,
  context: string,
  publicMessage = "Terjadi gangguan di server. Silakan coba lagi beberapa saat lagi.",
): NextResponse {
  const detail = err instanceof Error ? err.message : String(err);
  const kind = err instanceof SheetsConfigError ? "config" : "upstream";
  console.error(`[${context}] ${kind}: ${detail}`);
  return NextResponse.json(
    { error: publicMessage },
    { status: kind === "config" ? 500 : 502 },
  );
}

/** Kembalikan respons 429 kalau IP melewati batas, atau null kalau aman. */
export function rateLimited(
  req: Request,
  rule: RateLimitRule,
): NextResponse | null {
  const result = checkRateLimit(rule, clientIp(req));
  if (result.ok) return null;
  return NextResponse.json(
    {
      error:
        "Terlalu banyak permintaan dari perangkat Anda. Silakan tunggu beberapa menit lalu coba lagi.",
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}

/**
 * Field jebakan (honeypot). Form menyertakan input tersembunyi bernama
 * `website`; manusia tidak melihatnya, bot pengisi otomatis biasanya
 * mengisinya.
 */
export const HONEYPOT_FIELD = "website";

export function isHoneypotFilled(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const v = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}
