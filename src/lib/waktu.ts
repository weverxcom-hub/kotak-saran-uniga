import { randomInt } from "node:crypto";

/**
 * Semua waktu yang tercatat memakai WIB (Asia/Jakarta), bukan jam server.
 * Server Vercel berjalan dalam UTC, sehingga `Date#getHours()` dkk. dulu
 * mencatat laporan jam 06.00 WIB sebagai 23.00 hari sebelumnya.
 */
const TIME_ZONE = "Asia/Jakarta";

type Parts = {
  yyyy: string;
  mm: string;
  dd: string;
  h: string;
  min: string;
  sec: string;
};

export function wibParts(d: Date): Parts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    fmt.formatToParts(d).find((p) => p.type === type)?.value ?? "00";
  return {
    yyyy: get("year"),
    mm: get("month"),
    dd: get("day"),
    h: get("hour"),
    min: get("minute"),
    sec: get("second"),
  };
}

/** Format "DD/MM/YYYY HH:MM:SS" dalam WIB — sama dengan format Google Forms. */
export function formatWibTimestamp(d: Date): string {
  const p = wibParts(d);
  return `${p.dd}/${p.mm}/${p.yyyy} ${p.h}:${p.min}:${p.sec}`;
}

// Tanpa 0/O/1/I/L supaya mudah dibaca dan didiktekan ulang.
const CASE_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CASE_ID_RANDOM_LENGTH = 8;

/**
 * Case ID `WB-YYYYMMDD-XXXXXXXX`. Bagian acak 8 karakter dari 31 simbol
 * (≈ 8,5 × 10^11 kemungkinan per hari) memakai generator kriptografis,
 * jadi tidak bisa ditebak untuk mengintip status laporan orang lain.
 */
export function generateCaseId(now: Date): string {
  const p = wibParts(now);
  let rand = "";
  for (let i = 0; i < CASE_ID_RANDOM_LENGTH; i++) {
    rand += CASE_ID_ALPHABET[randomInt(CASE_ID_ALPHABET.length)];
  }
  return `WB-${p.yyyy}${p.mm}${p.dd}-${rand}`;
}
