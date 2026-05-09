import { google } from "googleapis";
import { SheetsConfigError } from "@/lib/sheets";

/**
 * Manajemen daftar Fakultas / Prodi (unit kerja) dinamis lewat Google Sheets.
 *
 * Disimpan di tab "Units" pada spreadsheet yang sama dengan submission.
 * Skema kolom (5 kolom A–E):
 *   A id        — slug unik, mis. "feb-manajemen", "fti-informatika"
 *   B fakultas  — nama fakultas (UPPERCASE direkomendasikan)
 *   C prodi     — nama prodi; kosong = entri level fakultas saja
 *   D aktif     — "Ya" / "Tidak" (toggle tanpa hapus baris)
 *   E urutan    — angka (kecil dulu); kosong = di akhir
 *
 * Form publik membaca via GET /api/units (cached server-side ~60s);
 * admin CRUD via /api/admin/units (proteksi cookie session yang sama
 * dengan /report).
 */

export const UNITS_SHEET_NAME = "Units";

export const UNITS_HEADERS = [
  "id",
  "fakultas",
  "prodi",
  "aktif",
  "urutan",
] as const;

export type UnitRow = {
  rowIndex: number;
  id: string;
  fakultas: string;
  prodi: string;
  aktif: boolean;
  urutan: number;
};

/**
 * Default seed Fakultas → Prodi Universitas Gajayana Malang. Dipakai dua hal:
 *  1. Tombol "Seed default" di admin panel (sekali klik bila tab Units
 *     masih kosong).
 *  2. Fallback API publik bila tab Units belum dibuat sama sekali —
 *     supaya form publik tidak jadi tidak bisa dipakai pada deploy
 *     pertama.
 *
 * Sumber: Wikipedia & laman resmi UNIGA Malang (3 fakultas + prodi).
 */
export const DEFAULT_UNITS: ReadonlyArray<{
  id: string;
  fakultas: string;
  prodi: string;
  urutan: number;
}> = [
  // Fakultas Ekonomi dan Bisnis (FEB)
  { id: "feb", fakultas: "FAKULTAS EKONOMI DAN BISNIS", prodi: "", urutan: 10 },
  { id: "feb-manajemen", fakultas: "FAKULTAS EKONOMI DAN BISNIS", prodi: "MANAJEMEN", urutan: 11 },
  { id: "feb-akuntansi", fakultas: "FAKULTAS EKONOMI DAN BISNIS", prodi: "AKUNTANSI", urutan: 12 },
  { id: "feb-ekonomi-pembangunan", fakultas: "FAKULTAS EKONOMI DAN BISNIS", prodi: "EKONOMI PEMBANGUNAN", urutan: 13 },
  // Fakultas Teknik dan Informatika (FTI)
  { id: "fti", fakultas: "FAKULTAS TEKNIK DAN INFORMATIKA", prodi: "", urutan: 20 },
  { id: "fti-sistem-informasi", fakultas: "FAKULTAS TEKNIK DAN INFORMATIKA", prodi: "SISTEM INFORMASI", urutan: 21 },
  { id: "fti-teknik-mesin", fakultas: "FAKULTAS TEKNIK DAN INFORMATIKA", prodi: "TEKNIK MESIN", urutan: 22 },
  { id: "fti-teknik-elektro", fakultas: "FAKULTAS TEKNIK DAN INFORMATIKA", prodi: "TEKNIK ELEKTRO", urutan: 23 },
  // Fakultas Ilmu Sosial dan Budaya (FISB)
  { id: "fisb", fakultas: "FAKULTAS ILMU SOSIAL DAN BUDAYA", prodi: "", urutan: 30 },
  { id: "fisb-psikologi", fakultas: "FAKULTAS ILMU SOSIAL DAN BUDAYA", prodi: "PSIKOLOGI", urutan: 31 },
  { id: "fisb-ilmu-komunikasi", fakultas: "FAKULTAS ILMU SOSIAL DAN BUDAYA", prodi: "ILMU KOMUNIKASI", urutan: 32 },
  { id: "fisb-sastra-inggris", fakultas: "FAKULTAS ILMU SOSIAL DAN BUDAYA", prodi: "SASTRA INGGRIS", urutan: 33 },
  // Pascasarjana
  { id: "pasca", fakultas: "PASCASARJANA", prodi: "", urutan: 40 },
  { id: "pasca-magister-manajemen", fakultas: "PASCASARJANA", prodi: "MAGISTER MANAJEMEN", urutan: 41 },
  // Unit kerja non-fakultas
  { id: "rektorat", fakultas: "REKTORAT & UNIT PUSAT", prodi: "", urutan: 90 },
  { id: "perpustakaan", fakultas: "REKTORAT & UNIT PUSAT", prodi: "PERPUSTAKAAN", urutan: 91 },
  { id: "bapa", fakultas: "REKTORAT & UNIT PUSAT", prodi: "BAGIAN ADMINISTRASI AKADEMIK", urutan: 92 },
];

// ─────────────────────────────────────────────────────────────────────
// Internal helpers — share env / credential parsing dengan lib/sheets.ts
// tapi tidak boleh circular import, jadi duplikasi minimal di sini.
// ─────────────────────────────────────────────────────────────────────

function normalizePrivateKey(raw: string): string {
  let key = raw
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  const beginMatch = key.match(/-----BEGIN [A-Z0-9 ]+-----/);
  const endMatch = key.match(/-----END [A-Z0-9 ]+-----/);
  if (beginMatch && endMatch) {
    const header = beginMatch[0];
    const footer = endMatch[0];
    const headerEnd = (beginMatch.index ?? 0) + header.length;
    const footerStart = endMatch.index ?? key.length;
    if (headerEnd < footerStart) {
      const middle = key.slice(headerEnd, footerStart);
      const base64 = middle.replace(/\s+/g, "");
      if (base64.length > 0) {
        const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
        key = `${header}\n${wrapped}\n${footer}`;
      }
    }
  }
  return key + "\n";
}

function getCredentials(): { client_email: string; private_key: string } {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    let parsed: { client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new SheetsConfigError(
        "GOOGLE_SERVICE_ACCOUNT_JSON tidak valid JSON.",
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new SheetsConfigError(
        "GOOGLE_SERVICE_ACCOUNT_JSON tidak punya client_email/private_key.",
      );
    }
    return {
      client_email: parsed.client_email,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new SheetsConfigError(
      "Service account belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }
  return { client_email: email, private_key: normalizePrivateKey(privateKey) };
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

function getSheetId(): string {
  const sheetId = process.env.REPORT_SHEET_ID;
  if (!sheetId) {
    throw new SheetsConfigError(
      "REPORT_SHEET_ID belum diset (ID spreadsheet Google).",
    );
  }
  return sheetId;
}

/**
 * Pastikan tab "Units" ada di spreadsheet. Buat baru kalau belum, dengan
 * header row default. Idempoten — kalau sudah ada, no-op.
 */
async function ensureUnitsSheet(): Promise<void> {
  const sheetId = getSheetId();
  const sheets = getSheetsClient("write");
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  const exists = (meta.data.sheets ?? []).some(
    (s) => s.properties?.title === UNITS_SHEET_NAME,
  );
  if (exists) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: UNITS_SHEET_NAME,
              gridProperties: {
                rowCount: 500,
                columnCount: UNITS_HEADERS.length,
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
    range: `${UNITS_SHEET_NAME}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [UNITS_HEADERS.slice()] },
  });
}

function parseRow(row: string[], rowIndex: number): UnitRow | null {
  const id = (row[0] ?? "").toString().trim();
  const fakultas = (row[1] ?? "").toString().trim();
  const prodi = (row[2] ?? "").toString().trim();
  const aktifRaw = (row[3] ?? "").toString().trim().toLowerCase();
  const urutanRaw = (row[4] ?? "").toString().trim();
  if (!id && !fakultas && !prodi) return null; // baris kosong
  const aktif = aktifRaw === "" || aktifRaw === "ya" || aktifRaw === "true" || aktifRaw === "1";
  const urutan = urutanRaw === "" ? 9999 : Number(urutanRaw);
  return {
    rowIndex,
    id: id || slugifyUnit(fakultas, prodi),
    fakultas,
    prodi,
    aktif,
    urutan: Number.isFinite(urutan) ? urutan : 9999,
  };
}

export function slugifyUnit(fakultas: string, prodi: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const f = norm(fakultas);
  const p = norm(prodi);
  return p ? `${f}-${p}` : f || "unit";
}

// In-memory cache untuk request publik (GET /api/units). TTL pendek
// supaya admin bisa lihat hasil edit-nya dalam ~1 menit.
let cache: { ts: number; rows: UnitRow[] } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidateUnitsCache(): void {
  cache = null;
}

/**
 * Ambil semua baris dari tab Units. Auto-create tab kalau belum ada.
 * Hasil tidak termasuk header. Tidak filter aktif (caller yang filter).
 */
export async function fetchAllUnits(opts?: { skipCache?: boolean }): Promise<UnitRow[]> {
  const skipCache = opts?.skipCache === true;
  if (!skipCache && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.rows;
  }
  const sheetId = getSheetId();
  const sheets = getSheetsClient();
  let res;
  try {
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${UNITS_SHEET_NAME}!A:E`,
      valueRenderOption: "FORMATTED_VALUE",
    });
  } catch (err) {
    // Sheet "Units" belum ada (deploy pertama). Kembalikan list kosong;
    // caller boleh fallback ke DEFAULT_UNITS.
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("unable to parse range") || message.includes("not found")) {
      cache = { ts: Date.now(), rows: [] };
      return [];
    }
    throw err;
  }
  const values = (res.data.values as string[][] | undefined) ?? [];
  if (values.length === 0) {
    cache = { ts: Date.now(), rows: [] };
    return [];
  }
  const out: UnitRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = parseRow(values[i] ?? [], i + 1);
    if (row) out.push(row);
  }
  out.sort(
    (a, b) =>
      a.urutan - b.urutan ||
      a.fakultas.localeCompare(b.fakultas) ||
      a.prodi.localeCompare(b.prodi),
  );
  cache = { ts: Date.now(), rows: out };
  return out;
}

/**
 * Daftar unit aktif yang dipakai form publik. Bila tab Units kosong /
 * belum ada, fallback ke DEFAULT_UNITS supaya form tetap usable.
 */
export async function fetchActiveUnits(): Promise<UnitRow[]> {
  const all = await fetchAllUnits();
  const active = all.filter((u) => u.aktif);
  if (active.length > 0) return active;
  // Fallback DEFAULT_UNITS — supaya deploy pertama tidak broken.
  return DEFAULT_UNITS.map((d, i) => ({
    rowIndex: -1 - i,
    id: d.id,
    fakultas: d.fakultas,
    prodi: d.prodi,
    aktif: true,
    urutan: d.urutan,
  }));
}

/**
 * Append satu unit baru. Auto-buat tab kalau belum ada. Return rowIndex.
 */
export async function appendUnit(input: {
  id?: string;
  fakultas: string;
  prodi?: string;
  aktif?: boolean;
  urutan?: number;
}): Promise<UnitRow> {
  await ensureUnitsSheet();
  const sheetId = getSheetId();
  const sheets = getSheetsClient("write");
  const fakultas = input.fakultas.trim();
  const prodi = (input.prodi ?? "").trim();
  if (!fakultas) throw new Error("Fakultas wajib diisi.");
  const id = (input.id ?? slugifyUnit(fakultas, prodi)).trim();
  const aktif = input.aktif !== false;
  const urutan = input.urutan ?? 9999;
  const row = [id, fakultas, prodi, aktif ? "Ya" : "Tidak", String(urutan)];
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${UNITS_SHEET_NAME}!A:E`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
  invalidateUnitsCache();
  // Coba parse rowIndex dari response (updatedRange "Units!A12:E12")
  const updated = res.data.updates?.updatedRange ?? "";
  const m = updated.match(/!A(\d+):/);
  const rowIndex = m ? Number(m[1]) : -1;
  return { rowIndex, id, fakultas, prodi, aktif, urutan };
}

/**
 * Update isi 1 baris berdasarkan rowIndex (1-indexed termasuk header).
 */
export async function updateUnit(rowIndex: number, input: {
  id: string;
  fakultas: string;
  prodi?: string;
  aktif: boolean;
  urutan: number;
}): Promise<void> {
  if (rowIndex < 2) throw new Error("rowIndex tidak valid.");
  const sheetId = getSheetId();
  const sheets = getSheetsClient("write");
  const fakultas = input.fakultas.trim();
  const prodi = (input.prodi ?? "").trim();
  const id = input.id.trim() || slugifyUnit(fakultas, prodi);
  if (!fakultas) throw new Error("Fakultas wajib diisi.");
  const row = [id, fakultas, prodi, input.aktif ? "Ya" : "Tidak", String(input.urutan)];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${UNITS_SHEET_NAME}!A${rowIndex}:E${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  invalidateUnitsCache();
}

/**
 * Hapus baris dengan rowIndex tertentu. Memakai batchUpdate `deleteDimension`
 * supaya baris di bawahnya naik (bukan sekadar dikosongkan).
 */
export async function deleteUnit(rowIndex: number): Promise<void> {
  if (rowIndex < 2) throw new Error("rowIndex tidak valid.");
  const sheetId = getSheetId();
  const sheets = getSheetsClient("write");
  // Cari sheetId numerik dari nama tab "Units"
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title,sheets.properties.sheetId",
  });
  const target = (meta.data.sheets ?? []).find(
    (s) => s.properties?.title === UNITS_SHEET_NAME,
  );
  const numericSheetId = target?.properties?.sheetId;
  if (numericSheetId === undefined || numericSheetId === null) {
    throw new Error("Tab Units tidak ditemukan.");
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: numericSheetId,
              dimension: "ROWS",
              // 0-indexed inclusive..exclusive
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
  invalidateUnitsCache();
}

/**
 * Bulk seed dengan DEFAULT_UNITS. Hanya append kalau tab Units betul-betul
 * kosong (selain header). Idempoten kalau dipanggil ulang setelah ada data:
 * tidak akan duplikasi karena cek isi dulu.
 */
export async function seedDefaultUnits(): Promise<{ inserted: number }> {
  await ensureUnitsSheet();
  const all = await fetchAllUnits({ skipCache: true });
  if (all.length > 0) return { inserted: 0 };
  const sheetId = getSheetId();
  const sheets = getSheetsClient("write");
  const rows = DEFAULT_UNITS.map((d) => [
    d.id,
    d.fakultas,
    d.prodi,
    "Ya",
    String(d.urutan),
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${UNITS_SHEET_NAME}!A:E`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
  invalidateUnitsCache();
  return { inserted: rows.length };
}

/**
 * Format unit jadi label tampilan tunggal (gabungan fakultas + prodi).
 * Dipakai saat append ke kolom "Unit kerja / Prodi" pada Sheet1 / Whistleblower.
 */
export function formatUnitLabel(fakultas: string, prodi: string): string {
  const f = fakultas.trim();
  const p = (prodi ?? "").trim();
  if (!p) return f;
  return `${f} — ${p}`;
}

/**
 * Cek apakah pasangan {fakultas, prodi} cocok dengan salah satu unit aktif.
 * Toleran terhadap whitespace & case. Dipakai saat validasi server.
 */
export function isValidUnit(
  units: UnitRow[],
  fakultas: string,
  prodi: string | undefined,
): boolean {
  const f = fakultas.trim().toLowerCase();
  const p = (prodi ?? "").trim().toLowerCase();
  return units.some(
    (u) =>
      u.aktif &&
      u.fakultas.trim().toLowerCase() === f &&
      u.prodi.trim().toLowerCase() === p,
  );
}
