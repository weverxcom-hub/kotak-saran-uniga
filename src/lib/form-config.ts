/**
 * Konfigurasi opsi form (peran) + tipe payload bersama.
 *
 * Catatan: dulu file ini juga menyimpan UNIT_OPTIONS hardcoded
 * (fakultas/prodi tertentu). Sekarang opsi unit/prodi disimpan secara
 * dinamis di tab "Units" pada Google Spreadsheet — lihat
 * `src/lib/units.ts` dan endpoint `/api/units`. Form publik akan
 * fetch list ini dari server saat load.
 */

export const ROLE_OPTIONS = ["DOSEN", "MAHASISWA", "TENDIK"] as const;
export type Role = (typeof ROLE_OPTIONS)[number];

export type AnonimChoice = "Ya" | "Tidak";

export type SuggestionPayload = {
  saudaraAdalah: Role | string;
  /** Fakultas yang dipilih. Untuk masukan tingkat fakultas, prodi boleh kosong. */
  fakultas: string;
  /** Prodi yang dipilih (opsional bila masukan tingkat fakultas saja). */
  prodi?: string;
  isAnonim: AnonimChoice;
  nama?: string;
  nim?: string;
  masukan: string;
  kronologi?: string;
  kontak?: string;
};
