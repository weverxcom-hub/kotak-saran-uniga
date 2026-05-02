import { google } from "googleapis";

/**
 * Klien Google Sheets API yang membaca spreadsheet jawaban Google Form.
 *
 * Kredensial diambil dari environment:
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (newline-encoded)
 *   - atau GOOGLE_SERVICE_ACCOUNT_JSON (JSON string utuh)
 *
 * Spreadsheet target diatur via:
 *   - REPORT_SHEET_ID  → ID spreadsheet
 *   - REPORT_SHEET_RANGE → mis. "Form Responses 1!A:M" (default ke A:Z dari sheet pertama)
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

function getCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new SheetsConfigError(
        "GOOGLE_SERVICE_ACCOUNT_JSON tidak valid JSON.",
      );
    }
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new SheetsConfigError(
      "Service account belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }
  // Vercel & sebagian platform menyimpan newline sebagai \n literal
  privateKey = privateKey.replace(/\\n/g, "\n");
  return { client_email: email, private_key: privateKey };
}

function getSheetsClient() {
  const creds = getCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
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
  // Google Forms timestamp default format: "11/2/2026 4:30:15"
  // bisa juga ISO. Normalisasi ke ISO string.
  const t = Date.parse(raw);
  if (!isNaN(t)) return new Date(t).toISOString();
  // Try DD/MM/YYYY HH:mm:ss
  const m = raw.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
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
    return d.toISOString();
  }
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

export type Stats = {
  total: number;
  anonim: number;
  identitas: number;
  perRole: Record<string, number>;
  perUnit: Record<string, number>;
  perMonth: Array<{ month: string; count: number }>;
};

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
