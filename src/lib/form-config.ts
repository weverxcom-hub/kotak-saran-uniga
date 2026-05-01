/**
 * Konfigurasi Google Form yang menjadi backend untuk Kotak Saran ini.
 *
 * Tiap nilai `entry.X` mengikuti id field di Google Form aslinya.
 * Untuk mengganti form target, ubah `FORM_ID` saja - semua field id
 * akan tetap ada di sini dan harus diselaraskan dengan form baru.
 */

export const FORM_ID =
  process.env.NEXT_PUBLIC_GOOGLE_FORM_ID ??
  "1FAIpQLSeIAV4B8E9sUkgDUqqo0e9Z9kMmlruKDSU6sTtk6AKlZFs-Sw";

export const FORM_RESPONSE_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

export const ENTRY_IDS = {
  saudaraAdalah: "entry.68711138",
  unitKerja: "entry.1100971767",
  isAnonim: "entry.1799182697",
  identitas: {
    nama: "entry.1136545179",
    nim: "entry.1716134788",
    masukan: "entry.42050814",
    kronologi: "entry.1935611261",
    kontak: "entry.832033557",
  },
  anonim: {
    masukan: "entry.355530228",
    kronologi: "entry.1480368575",
    kontak: "entry.929577293",
  },
} as const;

export const ROLE_OPTIONS = ["DOSEN", "MAHASISWA", "TENDIK"] as const;
export type Role = (typeof ROLE_OPTIONS)[number];

export const UNIT_OPTIONS = [
  "FAKULTAS EKONOMI DAN BISNIS",
  "MANAJEMEN",
  "AKUNTANSI",
  "EKONOMI PEMBANGUNAN",
] as const;
export type Unit = (typeof UNIT_OPTIONS)[number];

export type AnonimChoice = "Ya" | "Tidak";

export type SuggestionPayload = {
  saudaraAdalah: Role | string;
  unitKerja: Unit;
  isAnonim: AnonimChoice;
  nama?: string;
  nim?: string;
  masukan: string;
  kronologi?: string;
  kontak?: string;
};
