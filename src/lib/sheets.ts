import { google } from "googleapis";
import {
  isWhistleblowerStatus,
  type WhistleblowerStatus,
} from "@/lib/whistleblower-config";

/**
 * Klien Google Sheets API — baca dan tulis ke spreadsheet rekap masukan.
 *
 * Kredensial diambil dari environment:
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (newline-encoded)
 *   - atau GOOGLE_SERVICE_ACCOUNT_JSON (JSON string utuh)
 *
 * Service account harus diberi akses Editor pada spreadsheet target supaya
 * bisa append baris (untuk submission baru). Akses Viewer cukup untuk
 * /report yang hanya membaca.
 *
 * Spreadsheet target diatur via:
 *   - REPORT_SHEET_ID  → ID spreadsheet
 *   - REPORT_SHEET_RANGE → mis. "Sheet1!A:L" (default ke A:Z dari sheet pertama)
 */

export type RawRow = string[];

export type SubmissionRow = {
  rowIndex: number;
  timestamp: string; // ISO string
  saudaraAdalah: string;
  unitKerja: string;
  isAnonim: "Ya" | "Tidak" | string;
  // identitas branch
  nama: string;
  nim: string;
  masukanIdentitas: string;
  kronologiIdentitas: string;
  kontakIdentitas: string;
  // anonim branch
  masukanAnonim: string;
  kronologiAnonim: string;
  kontakAnonim: string;
  // unified for display
  masukan: string;
  kronologi: string;
  kontak: string;
};

export type SheetSchema = {
  headers: string[];
  /** Map dari header (lowercase) → indeks kolom */
  headerIndex: Record<string, number>;
};

export class SheetsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetsConfigError";
  }
}

/**
 * Normalisasi PEM private key dari env var. Berbagai host (Vercel di antaranya)
 * bisa mengirim value dalam bentuk yang tidak langsung dibaca OpenSSL:
 *  - Newline tersimpan sebagai literal "\n" (2 karakter) → ubah ke newline asli.
 *  - Line ending CRLF (\r\n) dari paste Windows → ubah ke LF (\n).
 *  - Newline dihilangkan total / diganti spasi (Vercel terkadang flatten
 *    multiline value saat disimpan dari UI) → rekonstruksi PEM dengan
 *    membungkus blok base64 jadi 64-char per baris sesuai RFC 7468.
 *  - Whitespace berlebih di awal/akhir → trim.
 *  - Akhiri dengan satu newline (beberapa parser PEM strict soal ini).
 *
 * Tanpa normalisasi ini, OpenSSL akan balas
 * "1E08010C:DECODER routines::unsupported" walau key terlihat valid.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Kasus terburuk: nilai sudah kehilangan newline (Vercel UI dapat flatten
  // multi-line value menjadi satu baris yang dipisah spasi). Selama header dan
  // footer PEM masih ada, kita bisa membentuk ulang PEM dengan membungkus
  // base64 jadi 64 karakter per baris.
  const beginMatch = key.match(/-----BEGIN [A-Z0-9 ]+-----/);
  const endMatch = key.match(/-----END [A-Z0-9 ]+-----/);
  if (beginMatch && endMatch) {
    const header = beginMatch[0];
    const footer = endMatch[0];
    const headerEnd = (beginMatch.index ?? 0) + header.length;
    const footerStart = endMatch.index ?? key.length;
    if (headerEnd < footerStart) {
      const middle = key.slice(headerEnd, footerStart);
      // Hapus SEMUA whitespace dalam blok base64, lalu wrap ulang per 64 char.
      const base64 = middle.replace(/\s+/g, "");
      if (base64.length > 0) {
        const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
        key = `${header}\n${wrapped}\n${footer}`;
      }
    }
  }

  return key + "\n";
}

function getCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    let parsed: { client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new SheetsConfigError(
        "GOOGLE_SERVICE_ACCOUNT_JSON tidak valid JSON. Pastikan value adalah single-line JSON (gunakan `jq -c .` atau pakai env var split GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).",
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new SheetsConfigError(
        "GOOGLE_SERVICE_ACCOUNT_JSON tidak punya client_email/private_key. Cek isi JSON-nya.",
      );
    }
    parsed.private_key = normalizePrivateKey(parsed.private_key);
    if (!parsed.private_key.startsWith("-----BEGIN")) {
      throw new SheetsConfigError(
        "private_key di GOOGLE_SERVICE_ACCOUNT_JSON tidak dimulai dengan '-----BEGIN'. Mungkin newline di-escape rusak.",
      );
    }
    return parsed;
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new SheetsConfigError(
      "Service account belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }
  privateKey = normalizePrivateKey(privateKey);
  if (!privateKey.startsWith("-----BEGIN")) {
    throw new SheetsConfigError(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tidak dimulai dengan '-----BEGIN PRIVATE KEY-----'. " +
        "Cek lagi: paste UTUH dari header `-----BEGIN PRIVATE KEY-----` sampai footer `-----END PRIVATE KEY-----` (boleh multiline; \\n literal juga didukung).",
    );
  }
  return { client_email: email, private_key: privateKey };
}

function getSheetsClient(scope: "read" | "write" = "read") {
  const creds = getCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      scope === "write"
        ? "https://www.googleapis.com/auth/spreadsheets"
        : "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  return google.sheets({ version: "v4", auth });
}

function getConfig() {
  const sheetId = process.env.REPORT_SHEET_ID;
  if (!sheetId) {
    throw new SheetsConfigError(
      "REPORT_SHEET_ID belum diset (ID spreadsheet Google).",
    );
  }
  const range = process.env.REPORT_SHEET_RANGE || "A:Z";
  return { sheetId, range };
}

/**
 * Heuristik mapping header Google Forms → field SubmissionRow.
 * Google Forms memberi header sesuai pertanyaan, jadi kita match longgar.
 */
const HEADER_PATTERNS: Array<[keyof SubmissionRow, RegExp[]]> = [
  ["timestamp", [/timestamp|stempel\s*waktu/i]],
  ["saudaraAdalah", [/saudara\s*adalah|peran|jabatan/i]],
  ["unitKerja", [/unit\s*kerja|prodi|program\s*studi|fakultas/i]],
  ["isAnonim", [/anonim|identitas\s*disembunyikan|tidak\s*disebut/i]],
  ["nama", [/^nama\b|nama\s*lengkap/i]],
  ["nim", [/\bnim\b|nip|nidn/i]],
  [
    "masukanIdentitas",
    [/masukan.*identitas|masukan.*nama|saran.*identitas/i],
  ],
  [
    "kronologiIdentitas",
    [/kronologi.*identitas|kronologi.*nama|kejadian.*identitas/i],
  ],
  [
    "kontakIdentitas",
    [/kontak.*identitas|kontak.*nama|wa.*identitas|telepon.*identitas/i],
  ],
  ["masukanAnonim", [/masukan.*anonim|saran.*anonim/i]],
  ["kronologiAnonim", [/kronologi.*anonim|kejadian.*anonim/i]],
  ["kontakAnonim", [/kontak.*anonim|wa.*anonim|telepon.*anonim/i]],
];

function buildColumnMap(headers: string[]): Record<keyof SubmissionRow, number> {
  const map: Partial<Record<keyof SubmissionRow, number>> = {};
  for (const [field, patterns] of HEADER_PATTERNS) {
    const idx = headers.findIndex((h) => patterns.some((p) => p.test(h)));
    if (idx >= 0) map[field] = idx;
  }
  // Fallback berdasarkan urutan kolom Google Form (jika header tidak match)
  // Format Google Form ini menghasilkan urutan kira-kira:
  //   0: Timestamp
  //   1: Saudara adalah
  //   2: Unit kerja
  //   3: Anonim?
  //   4: Nama (identitas)
  //   5: NIM (identitas)
  //   6: Masukan (identitas)
  //   7: Kronologi (identitas)
  //   8: Kontak (identitas)
  //   9: Masukan (anonim)
  //  10: Kronologi (anonim)
  //  11: Kontak (anonim)
  const FALLBACK: Array<[keyof SubmissionRow, number]> = [
    ["timestamp", 0],
    ["saudaraAdalah", 1],
    ["unitKerja", 2],
    ["isAnonim", 3],
    ["nama", 4],
    ["nim", 5],
    ["masukanIdentitas", 6],
    ["kronologiIdentitas", 7],
    ["kontakIdentitas", 8],
    ["masukanAnonim", 9],
    ["kronologiAnonim", 10],
    ["kontakAnonim", 11],
  ];
  for (const [field, idx] of FALLBACK) {
    if (map[field] === undefined && idx < headers.length) map[field] = idx;
  }
  return map as Record<keyof SubmissionRow, number>;
}

function parseTimestamp(raw: string): string {
  if (!raw) return "";
  // Google Forms (Indonesia) menulis timestamp dalam format DD/MM/YYYY HH:mm:ss.
  // Coba pola DD/MM lebih dulu, karena Date.parse() Node akan salah menafsirkan
  // sebagai US MM/DD/YYYY ketika dd <= 12 dan mm <= 12 (mis. "5/3/2026" jadi May 3,
  // padahal di form Indonesia maksudnya 5 Maret).
  const m = raw.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/,
  );
  if (m) {
    const [, dd, mm, yyyy, h, min, sec] = m;
    const fullYear = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy);
    const d = new Date(
      fullYear,
      Number(mm) - 1,
      Number(dd),
      Number(h),
      Number(min),
      Number(sec ?? 0),
    );
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // Pola ISO atau format lain yang dipahami Date.parse (mis. spreadsheet yang
  // sudah dinormalisasi ke ISO).
  const t = Date.parse(raw);
  if (!isNaN(t)) return new Date(t).toISOString();
  return raw;
}

export async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const { sheetId, range } = getConfig();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = (res.data.values as RawRow[] | undefined) ?? [];
  if (values.length === 0) return [];
  const [headers, ...rows] = values;
  const map = buildColumnMap(headers);
  const out: SubmissionRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c?.toString().trim())) continue;
    const get = (k: keyof SubmissionRow) => {
      const idx = map[k];
      if (idx === undefined) return "";
      return (row[idx] ?? "").toString().trim();
    };
    const isAnonim = get("isAnonim");
    const masukanIdentitas = get("masukanIdentitas");
    const masukanAnonim = get("masukanAnonim");
    out.push({
      rowIndex: i + 2, // sheet row (1-indexed; +1 for header)
      timestamp: parseTimestamp(get("timestamp")),
      saudaraAdalah: get("saudaraAdalah"),
      unitKerja: get("unitKerja"),
      isAnonim: isAnonim,
      nama: get("nama"),
      nim: get("nim"),
      masukanIdentitas,
      kronologiIdentitas: get("kronologiIdentitas"),
      kontakIdentitas: get("kontakIdentitas"),
      masukanAnonim,
      kronologiAnonim: get("kronologiAnonim"),
      kontakAnonim: get("kontakAnonim"),
      // unified
      masukan: masukanIdentitas || masukanAnonim,
      kronologi: get("kronologiIdentitas") || get("kronologiAnonim"),
      kontak: get("kontakIdentitas") || get("kontakAnonim"),
    });
  }
  return out;
}

export type Filters = {
  q?: string;
  role?: string;
  unit?: string;
  mode?: "Ya" | "Tidak" | "all";
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
};

export function applyFilters(
  rows: SubmissionRow[],
  filters: Filters,
): SubmissionRow[] {
  const q = filters.q?.toLowerCase().trim();
  const from = filters.dateFrom ? Date.parse(filters.dateFrom) : NaN;
  const to = filters.dateTo
    ? Date.parse(filters.dateTo) + 24 * 60 * 60 * 1000 - 1
    : NaN;
  return rows.filter((r) => {
    if (filters.role && filters.role !== "all" && r.saudaraAdalah !== filters.role)
      return false;
    if (filters.unit && filters.unit !== "all" && r.unitKerja !== filters.unit)
      return false;
    if (filters.mode && filters.mode !== "all") {
      // Normalisasi: Google Form bisa simpan "Ya" / "Tidak" atau "Anonim" / "Identitas"
      const isAnonim = /ya|anonim/i.test(r.isAnonim);
      const wantAnonim = filters.mode === "Ya";
      if (isAnonim !== wantAnonim) return false;
    }
    if (!isNaN(from) || !isNaN(to)) {
      const t = Date.parse(r.timestamp);
      if (isNaN(t)) return false;
      if (!isNaN(from) && t < from) return false;
      if (!isNaN(to) && t > to) return false;
    }
    if (q) {
      const haystack = [
        r.saudaraAdalah,
        r.unitKerja,
        r.nama,
        r.nim,
        r.masukan,
        r.kronologi,
        r.kontak,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Format timestamp Indonesia (DD/MM/YYYY HH:mm:ss) — sama dengan format yang
 * Google Forms tulis di spreadsheet jawaban, supaya parser di sisi /report
 * kompatibel.
 */
function formatIndonesianTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const sec = pad(d.getSeconds());
  return `${dd}/${mm}/${yyyy} ${h}:${min}:${sec}`;
}

export type AppendPayload = {
  saudaraAdalah: string;
  unitKerja: string;
  isAnonim: "Ya" | "Tidak";
  nama?: string;
  nim?: string;
  masukan: string;
  kronologi?: string;
  kontak?: string;
};

/**
 * Append satu baris ke spreadsheet rekap. Skema kolom (12 kolom):
 *   A Timestamp
 *   B Saudara adalah
 *   C Unit kerja / Prodi
 *   D Apakah Anonim?
 *   E Nama (jika identitas)
 *   F NIM/NIP (jika identitas)
 *   G Masukan (identitas)
 *   H Kronologi (identitas)
 *   I Kontak (identitas)
 *   J Masukan (anonim)
 *   K Kronologi (anonim)
 *   L Kontak (anonim)
 *
 * Service account butuh akses Editor pada spreadsheet target.
 */
export async function appendSubmission(payload: AppendPayload): Promise<void> {
  const { sheetId } = getConfig();
  const sheets = getSheetsClient("write");
  const isAnonim = payload.isAnonim === "Ya";
  const timestamp = formatIndonesianTimestamp(new Date());
  const row = [
    timestamp, // A
    payload.saudaraAdalah, // B
    payload.unitKerja, // C
    payload.isAnonim, // D "Ya" | "Tidak"
    isAnonim ? "" : (payload.nama ?? ""), // E
    isAnonim ? "" : (payload.nim ?? ""), // F
    isAnonim ? "" : payload.masukan, // G
    isAnonim ? "" : (payload.kronologi ?? ""), // H
    isAnonim ? "" : (payload.kontak ?? ""), // I
    isAnonim ? payload.masukan : "", // J
    isAnonim ? (payload.kronologi ?? "") : "", // K
    isAnonim ? (payload.kontak ?? "") : "", // L
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A:L",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

export type Stats = {
  total: number;
  anonim: number;
  identitas: number;
  perRole: Record<string, number>;
  perUnit: Record<string, number>;
  perMonth: Array<{ month: string; count: number }>;
};

// ─────────────────────────────────────────────────────────────────────
// Whistleblower (laporan pelanggaran)
//
// Disimpan di TAB TERPISAH bernama "Whistleblower" pada spreadsheet yang
// sama. Skema kolom (15 kolom A–O):
//   A Timestamp
//   B Case ID            (WB-YYYYMMDD-XXXX, di-generate server)
//   C Kategori
//   D Saudara adalah
//   E Unit kerja / Prodi
//   F Pihak Terlibat
//   G Apakah Anonim?     (Ya / Tidak)
//   H Nama               (kalau identitas)
//   I NIM/NIP            (kalau identitas)
//   J Kontak             (kalau identitas)
//   K Detail Pelaporan
//   L Kronologi & Bukti
//   M Status             (Diterima / Sedang ditindaklanjuti / Selesai /
//                          Ditolak — default "Diterima" saat dibuat)
//   N Catatan Publik     (free-text, ditampilkan ke pelapor di /lacak)
//   O Status Updated At  (ISO; di-update server saat admin ubah M / N)
//
// Untuk WB, kolom Detail (K) dan Kronologi (L) selalu terisi tanpa
// peduli mode anonim — yang ditahan hanya kolom identitas H/I/J.
//
// Backward-compat: spreadsheet lama (12 kolom) tetap valid. Saat baris
// baru ditambahkan atau saat admin update status untuk pertama kali,
// kolom M:O akan otomatis ditulis. Baris lama tanpa M dianggap
// status "Diterima" oleh fungsi pembaca.
// ─────────────────────────────────────────────────────────────────────

export const WHISTLEBLOWER_SHEET_NAME = "Whistleblower";

export const WHISTLEBLOWER_HEADERS = [
  "Timestamp",
  "Case ID",
  "Kategori",
  "Saudara adalah",
  "Unit kerja / Prodi",
  "Pihak Terlibat",
  "Apakah Anonim?",
  "Nama (jika identitas)",
  "NIM/NIP (jika identitas)",
  "Kontak (jika identitas)",
  "Detail Pelaporan",
  "Kronologi & Bukti",
  "Status",
  "Catatan Publik",
  "Status Updated At",
] as const;

// Konstanta status whistleblower dipindah ke `lib/whistleblower-config.ts`
// supaya bisa di-import oleh komponen "use client" tanpa men-trigger
// bundling googleapis ke browser. Re-export di sini agar kode server
// existing (yang import dari `lib/sheets`) tetap bekerja.
export {
  WHISTLEBLOWER_STATUSES,
  isWhistleblowerStatus,
} from "@/lib/whistleblower-config";
export type { WhistleblowerStatus } from "@/lib/whistleblower-config";

export type WhistleblowerRow = {
  rowIndex: number;
  timestamp: string; // ISO
  caseId: string;
  kategori: string;
  saudaraAdalah: string;
  unitKerja: string;
  pihakTerlibat: string;
  isAnonim: "Ya" | "Tidak" | string;
  nama: string;
  nim: string;
  kontak: string;
  detail: string;
  kronologi: string;
  status: WhistleblowerStatus;
  catatanPublik: string;
  statusUpdatedAt: string;
};

export type WhistleblowerStats = {
  total: number;
  anonim: number;
  identitas: number;
  perKategori: Record<string, number>;
  perUnit: Record<string, number>;
  perMonth: Array<{ month: string; count: number }>;
};

export type WhistleblowerAppendPayload = {
  saudaraAdalah: string;
  unitKerja: string;
  kategori: string;
  pihakTerlibat?: string;
  isAnonim: "Ya" | "Tidak";
  nama?: string;
  nim?: string;
  kontak?: string;
  detail: string;
  kronologi?: string;
};

/**
 * Pastikan tab "Whistleblower" siap pakai. Kalau belum ada, buat baru
 * dengan header lengkap (15 kolom). Kalau sudah ada tapi memakai skema
 * lama (12 kolom), tambahkan header kolom M:O tanpa menyentuh data
 * existing — backward-compat untuk spreadsheet yang sudah berisi
 * laporan dari versi sebelumnya.
 */
async function ensureWhistleblowerSheet(): Promise<void> {
  const { sheetId } = getConfig();
  const sheets = getSheetsClient("write");
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  const exists = (meta.data.sheets ?? []).some(
    (s) => s.properties?.title === WHISTLEBLOWER_SHEET_NAME,
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: WHISTLEBLOWER_SHEET_NAME,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: WHISTLEBLOWER_HEADERS.length,
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${WHISTLEBLOWER_SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [WHISTLEBLOWER_HEADERS.slice()] },
    });
    return;
  }
  // Sheet sudah ada — pastikan header row-nya 15 kolom (migrasi v1→v2).
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${WHISTLEBLOWER_SHEET_NAME}!A1:O1`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const headerRow = (headerRes.data.values?.[0] ?? []) as string[];
  if (headerRow.length < WHISTLEBLOWER_HEADERS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${WHISTLEBLOWER_SHEET_NAME}!A1:O1`,
      valueInputOption: "RAW",
      requestBody: { values: [WHISTLEBLOWER_HEADERS.slice()] },
    });
  }
}

function generateCaseId(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  // 4-char base36 random suffix, agar pendek tapi cukup unik untuk
  // mencegah collision pada submission yang sangat dekat (per-detik).
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `WB-${y}${m}${d}-${rand}`;
}

/**
 * Append satu baris laporan whistleblower ke tab "Whistleblower". Auto
 * create tab kalau belum ada. Status default "Diterima" supaya pelapor
 * yang lacak Case ID langsung lihat "Diterima" tanpa menunggu admin.
 * Mengembalikan Case ID yang ter-generate.
 */
export async function appendWhistleblowerReport(
  payload: WhistleblowerAppendPayload,
): Promise<{ caseId: string; timestamp: string }> {
  await ensureWhistleblowerSheet();
  const { sheetId } = getConfig();
  const sheets = getSheetsClient("write");
  const now = new Date();
  const isAnonim = payload.isAnonim === "Ya";
  const timestamp = formatIndonesianTimestamp(now);
  const caseId = generateCaseId(now);
  const row = [
    timestamp, // A
    caseId, // B
    payload.kategori, // C
    payload.saudaraAdalah, // D
    payload.unitKerja, // E
    payload.pihakTerlibat ?? "", // F
    payload.isAnonim, // G
    isAnonim ? "" : (payload.nama ?? ""), // H
    isAnonim ? "" : (payload.nim ?? ""), // I
    isAnonim ? "" : (payload.kontak ?? ""), // J
    payload.detail, // K
    payload.kronologi ?? "", // L
    "Diterima", // M — status default
    "", // N — catatan publik
    timestamp, // O — status updated at
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${WHISTLEBLOWER_SHEET_NAME}!A:O`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
  return { caseId, timestamp };
}

function normalizeStatusCell(raw: string): WhistleblowerStatus {
  const trimmed = raw.trim();
  if (!trimmed) return "Diterima";
  if (isWhistleblowerStatus(trimmed)) return trimmed;
  // Toleransi typo / variasi penulisan dari spreadsheet manual.
  const lower = trimmed.toLowerCase();
  if (lower.includes("selesai")) return "Selesai";
  if (lower.includes("tolak") || lower.includes("tidak relevan"))
    return "Ditolak / Tidak relevan";
  if (
    lower.includes("tindak") ||
    lower.includes("proses") ||
    lower.includes("progress")
  )
    return "Sedang ditindaklanjuti";
  return "Diterima";
}

export async function fetchWhistleblowerReports(): Promise<WhistleblowerRow[]> {
  const { sheetId } = getConfig();
  const sheets = getSheetsClient();
  // Coba baca dengan asumsi sheet sudah ada.
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${WHISTLEBLOWER_SHEET_NAME}!A:O`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const values = (res.data.values as RawRow[] | undefined) ?? [];
    if (values.length === 0) return [];
    const [, ...rows] = values; // skip header
    const out: WhistleblowerRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every((c) => !c?.toString().trim())) continue;
      const cell = (idx: number) => (r[idx] ?? "").toString().trim();
      const timestamp = parseTimestamp(cell(0));
      out.push({
        rowIndex: i + 2,
        timestamp,
        caseId: cell(1),
        kategori: cell(2),
        saudaraAdalah: cell(3),
        unitKerja: cell(4),
        pihakTerlibat: cell(5),
        isAnonim: cell(6),
        nama: cell(7),
        nim: cell(8),
        kontak: cell(9),
        detail: cell(10),
        kronologi: cell(11),
        status: normalizeStatusCell(cell(12)),
        catatanPublik: cell(13),
        statusUpdatedAt: cell(14)
          ? parseTimestamp(cell(14))
          : timestamp,
      });
    }
    return out;
  } catch (err) {
    // Sheet "Whistleblower" mungkin belum dibuat (belum pernah submit).
    // Kembalikan list kosong supaya dashboard tetap bisa render.
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("unable to parse range") || message.includes("not found")) {
      return [];
    }
    throw err;
  }
}

/**
 * Lookup publik berdasarkan Case ID. Hanya mengembalikan field yang aman
 * untuk diketahui pelapor (Case ID, kategori, status, catatan publik,
 * tanggal lapor + tanggal update). TIDAK mengembalikan detail pelaporan,
 * identitas, atau kontak — supaya kalau Case ID bocor pun isi kasus
 * tetap aman.
 */
export type WhistleblowerPublicStatus = {
  caseId: string;
  kategori: string;
  status: WhistleblowerStatus;
  catatanPublik: string;
  reportedAt: string;
  statusUpdatedAt: string;
};

export async function fetchWhistleblowerPublicStatus(
  caseId: string,
): Promise<WhistleblowerPublicStatus | null> {
  const trimmed = caseId.trim();
  if (!trimmed) return null;
  const all = await fetchWhistleblowerReports();
  const target = trimmed.toUpperCase();
  const found = all.find((r) => r.caseId.toUpperCase() === target);
  if (!found) return null;
  return {
    caseId: found.caseId,
    kategori: found.kategori,
    status: found.status,
    catatanPublik: found.catatanPublik,
    reportedAt: found.timestamp,
    statusUpdatedAt: found.statusUpdatedAt || found.timestamp,
  };
}

/**
 * Update status & catatan publik untuk satu baris whistleblower.
 * `rowIndex` 1-indexed termasuk header (sama seperti unit). Penulisan
 * sekaligus mengisi kolom O (Status Updated At) dengan timestamp
 * sekarang.
 */
export async function updateWhistleblowerStatus(
  rowIndex: number,
  input: { status: WhistleblowerStatus; catatanPublik: string },
): Promise<{ statusUpdatedAt: string }> {
  if (!Number.isInteger(rowIndex) || rowIndex < 2) {
    throw new Error("rowIndex tidak valid.");
  }
  await ensureWhistleblowerSheet();
  const { sheetId } = getConfig();
  const sheets = getSheetsClient("write");
  const now = new Date();
  const statusUpdatedAt = formatIndonesianTimestamp(now);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${WHISTLEBLOWER_SHEET_NAME}!M${rowIndex}:O${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[input.status, input.catatanPublik, statusUpdatedAt]],
    },
  });
  return { statusUpdatedAt };
}

export type WhistleblowerFilters = {
  q?: string;
  kategori?: string;
  unit?: string;
  mode?: "Ya" | "Tidak" | "all";
  status?: WhistleblowerStatus | "all";
  dateFrom?: string;
  dateTo?: string;
};

export function applyWhistleblowerFilters(
  rows: WhistleblowerRow[],
  filters: WhistleblowerFilters,
): WhistleblowerRow[] {
  const q = filters.q?.toLowerCase().trim();
  const from = filters.dateFrom ? Date.parse(filters.dateFrom) : NaN;
  const to = filters.dateTo
    ? Date.parse(filters.dateTo) + 24 * 60 * 60 * 1000 - 1
    : NaN;
  return rows.filter((r) => {
    if (
      filters.kategori &&
      filters.kategori !== "all" &&
      r.kategori !== filters.kategori
    )
      return false;
    if (filters.unit && filters.unit !== "all" && r.unitKerja !== filters.unit)
      return false;
    if (filters.mode && filters.mode !== "all") {
      const isAnonim = /ya|anonim/i.test(r.isAnonim);
      const wantAnonim = filters.mode === "Ya";
      if (isAnonim !== wantAnonim) return false;
    }
    if (filters.status && filters.status !== "all") {
      if (r.status !== filters.status) return false;
    }
    if (!isNaN(from) || !isNaN(to)) {
      const t = Date.parse(r.timestamp);
      if (isNaN(t)) return false;
      if (!isNaN(from) && t < from) return false;
      if (!isNaN(to) && t > to) return false;
    }
    if (q) {
      const haystack = [
        r.caseId,
        r.kategori,
        r.saudaraAdalah,
        r.unitKerja,
        r.pihakTerlibat,
        r.nama,
        r.nim,
        r.kontak,
        r.detail,
        r.kronologi,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function computeWhistleblowerStats(
  rows: WhistleblowerRow[],
): WhistleblowerStats {
  const perKategori: Record<string, number> = {};
  const perUnit: Record<string, number> = {};
  const perMonthMap = new Map<string, number>();
  let anonim = 0;
  for (const r of rows) {
    const kat = r.kategori || "(tidak diisi)";
    perKategori[kat] = (perKategori[kat] ?? 0) + 1;
    const unit = r.unitKerja || "(tidak diisi)";
    perUnit[unit] = (perUnit[unit] ?? 0) + 1;
    if (/ya|anonim/i.test(r.isAnonim)) anonim++;
    if (r.timestamp) {
      const d = new Date(r.timestamp);
      if (!isNaN(d.getTime())) {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        perMonthMap.set(key, (perMonthMap.get(key) ?? 0) + 1);
      }
    }
  }
  const perMonth = Array.from(perMonthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return {
    total: rows.length,
    anonim,
    identitas: rows.length - anonim,
    perKategori,
    perUnit,
    perMonth,
  };
}

export function computeStats(rows: SubmissionRow[]): Stats {
  const perRole: Record<string, number> = {};
  const perUnit: Record<string, number> = {};
  const perMonthMap = new Map<string, number>();
  let anonim = 0;
  for (const r of rows) {
    const role = r.saudaraAdalah || "(tidak diisi)";
    perRole[role] = (perRole[role] ?? 0) + 1;
    const unit = r.unitKerja || "(tidak diisi)";
    perUnit[unit] = (perUnit[unit] ?? 0) + 1;
    if (/ya|anonim/i.test(r.isAnonim)) anonim++;
    if (r.timestamp) {
      const d = new Date(r.timestamp);
      if (!isNaN(d.getTime())) {
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        perMonthMap.set(key, (perMonthMap.get(key) ?? 0) + 1);
      }
    }
  }
  const perMonth = Array.from(perMonthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  return {
    total: rows.length,
    anonim,
    identitas: rows.length - anonim,
    perRole,
    perUnit,
    perMonth,
  };
}
