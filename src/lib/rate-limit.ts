/**
 * Pembatas permintaan sederhana per alamat IP (jendela geser di memori).
 *
 * Catatan jujur: di Vercel tiap instance fungsi punya memorinya sendiri,
 * jadi batas ini "best effort" — cukup untuk menghentikan skrip iseng
 * dari satu IP, bukan serangan terdistribusi. Untuk perlindungan penuh,
 * tambahkan aturan Rate Limit di Vercel Firewall (lihat README).
 *
 * IP hanya dipakai di memori untuk menghitung, tidak pernah disimpan ke
 * spreadsheet atau log aplikasi.
 */
type Bucket = number[];

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export type RateLimitRule = {
  /** Nama aturan, dipakai sebagai awalan kunci. */
  name: string;
  /** Jumlah permintaan yang diizinkan dalam jendela. */
  limit: number;
  /** Panjang jendela dalam milidetik. */
  windowMs: number;
};

export const RULES = {
  submit: { name: "submit", limit: 5, windowMs: 10 * 60_000 },
  lacak: { name: "lacak", limit: 30, windowMs: 10 * 60_000 },
  login: { name: "login", limit: 5, windowMs: 15 * 60_000 },
} satisfies Record<string, RateLimitRule>;

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkRateLimit(
  rule: RateLimitRule,
  key: string,
  now = Date.now(),
): RateLimitResult {
  const k = `${rule.name}:${key}`;
  const since = now - rule.windowMs;
  const hits = (buckets.get(k) ?? []).filter((t) => t > since);
  if (hits.length >= rule.limit) {
    buckets.set(k, hits);
    const retryAfterSec = Math.max(1, Math.ceil((hits[0]! + rule.windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  hits.push(now);
  buckets.set(k, hits);
  if (buckets.size > MAX_KEYS) {
    // Buang kunci paling lama supaya memori tidak tumbuh tanpa batas.
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return { ok: true };
}

/** Hanya untuk test. */
export function _resetRateLimits(): void {
  buckets.clear();
}
