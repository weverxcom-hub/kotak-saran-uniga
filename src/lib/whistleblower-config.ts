/**
 * Konfigurasi & tipe untuk fitur Whistleblower (laporan pelanggaran).
 *
 * Kontekstnya berbeda dengan kotak saran biasa:
 *  - Tone & flow lebih formal, default anonim aktif.
 *  - Ada kategori pelanggaran wajib + field "pihak terlibat".
 *  - Setiap laporan mendapat Case ID untuk follow-up.
 *  - Disimpan ke tab "Whistleblower" pada spreadsheet yang sama
 *    (lihat `lib/sheets.ts`).
 */

import type { AnonimChoice, Role } from "@/lib/form-config";

export const WHISTLEBLOWER_CATEGORIES = [
  "Korupsi/Gratifikasi",
  "Kekerasan/Pelecehan Seksual",
  "Kecurangan Akademik (plagiarisme/joki)",
  "Konflik Kepentingan",
  "Pelanggaran Tata Tertib Pegawai",
  "Lainnya",
] as const;

export type WhistleblowerCategory = (typeof WHISTLEBLOWER_CATEGORIES)[number];

/**
 * Daftar status valid untuk laporan whistleblower. Diekspor dari modul
 * client-safe (tanpa dependensi googleapis) supaya bisa di-import oleh
 * komponen "use client" tanpa men-trigger bundling googleapis ke browser.
 * Backend re-export dari `lib/sheets.ts` untuk konsistensi.
 *
 * Urutan ini juga jadi urutan default di UI dropdown admin.
 */
export const WHISTLEBLOWER_STATUSES = [
  "Diterima",
  "Sedang ditindaklanjuti",
  "Selesai",
  "Ditolak / Tidak relevan",
] as const;

export type WhistleblowerStatus = (typeof WHISTLEBLOWER_STATUSES)[number];

export function isWhistleblowerStatus(
  v: unknown,
): v is WhistleblowerStatus {
  return (
    typeof v === "string" &&
    (WHISTLEBLOWER_STATUSES as readonly string[]).includes(v)
  );
}

export type WhistleblowerPayload = {
  saudaraAdalah: Role | string;
  /** Fakultas yang dipilih. Untuk laporan tingkat fakultas, prodi boleh kosong. */
  fakultas: string;
  /** Prodi yang dipilih (opsional bila laporan tingkat fakultas saja). */
  prodi?: string;
  kategori: WhistleblowerCategory;
  pihakTerlibat?: string;
  isAnonim: AnonimChoice;
  nama?: string;
  nim?: string;
  kontak?: string;
  detail: string;
  kronologi?: string;
};
