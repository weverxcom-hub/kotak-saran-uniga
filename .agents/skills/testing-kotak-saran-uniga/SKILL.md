---
name: testing-kotak-saran-uniga
description: Runbook untuk tes end-to-end aplikasi kotak-saran-uniga (Next.js + Google Sheets) di localhost. Pakai skill ini saat user minta tes UI, alur saran, alur whistleblower, /lacak public lookup, atau admin dashboard. Termasuk konvensi prefix test data, /lacak field allowlist, dan known minor issues yang sudah pre-existing.
---

# Testing kotak-saran-uniga

App ini adalah portal saran/kritik + whistleblower tingkat universitas (UNIGA Malang).
Next.js 14 App Router + TypeScript strict, data tersimpan di Google Sheets.

## Env vars yang dibutuhkan

Wajib (semua sudah di-store sebagai user-scope secret):
- `REPORT_PASSWORD` — password admin (`/report` & `/report/whistleblower`)
- `REPORT_SHEET_ID` — Sheet ID spreadsheet target
- `GOOGLE_SERVICE_ACCOUNT_JSON` — JSON service account utuh (prioritas atas EMAIL+PRIVATE_KEY kalau dua-duanya di-set)

Cek `getCredentials()` di `src/lib/sheets.ts` — JSON dipakai duluan, fallback ke email+private_key.

## Cara jalan lokal

```bash
npm run dev          # http://localhost:3000
npm run lint         # ESLint
npm run build        # Next build
```

Homepage `/` adalah landing 2-card (Saran/Kritik kiri navy, Whistleblower kanan rose). Form saran dipisah di `/saran` (4-step wizard), form whistleblower di `/whistleblower`, public Case ID lookup di `/lacak`.

## Konvensi tes data (WAJIB kalau pakai sheet produksi)

User kadang minta tes pakai sheet utama (bukan test sheet). Strategy:

1. **Prefix semua submission saran/whistleblower** dengan `[TEST DEVIN <DATE> — JANGAN PROSES]` di kolom `masukan` / `detail` / `kronologi`.
2. **Catat semua Case ID** yang di-generate (format `WB-YYYYMMDD-XXXX`).
3. **Jangan modifikasi row existing** — admin update status hanya untuk row yang dibuat tes.
4. **Cleanup** setelah tes selesai. Lihat section di bawah.

## Cleanup via Sheets API

Daripada delete manual lewat UI, pakai script di runtime ini (butuh env `GOOGLE_SERVICE_ACCOUNT_JSON` + `REPORT_SHEET_ID`):

```javascript
// cleanup-test-rows.mjs (jangan commit ke repo)
import { google } from "googleapis";

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// 1. spreadsheets.get fields=sheets.properties → ambil sheetId per tab
// 2. spreadsheets.values.get range=`${tab}!A:Z` → list rows
// 3. Identifikasi test rows (cek prefix "[TEST DEVIN" / "test devin" + timestamp window)
// 4. spreadsheets.batchUpdate dengan deleteDimension (sort indices DESC dulu!)
```

Simpan script-nya di `/home/ubuntu/cleanup-test-rows.mjs` (di luar repo) supaya gak ke-commit. Copy ke dalam repo cuma sebentar buat run karena `googleapis` ada di node_modules-nya.

Penting: sortir indices DESCENDING sebelum delete (kalau ascending, indices akan shift setelah delete pertama).

## /lacak field allowlist (security check)

`/api/lacak/[caseId]` hanya boleh return field-field ini:

```
caseId, kategori, status, catatanPublik, reportedAt, statusUpdatedAt
```

Tidak boleh kebocoran:
- `detail` / `kronologi` (isi laporan)
- `nama` / `nim` / `kontak` (identitas pelapor)
- `isAnonim` / `saudaraAdalah` / `unitKerja` / `pihakTerlibat`
- `rowIndex` / `timestamp`

Validasi via curl:
```bash
curl http://localhost:3000/api/lacak/<CASE_ID> | jq
```

## Status whistleblower yang valid

4 nilai (di `src/lib/whistleblower-config.ts`):
- `Diterima` (default, amber)
- `Sedang ditindaklanjuti` (blue)
- `Selesai` (green)
- `Ditolak / Tidak relevan` (red)

Validasi server side ada di `/api/admin/whistleblower/[rowIndex]/route.ts`.

## Schema spreadsheet

Tab `Sheet1` (saran), 12 kolom A-L:
```
A Timestamp · B Saudara · C UnitKerja · D IsAnonim · E Nama · F NIM · G Masukan(identitas)
H Kronologi(identitas) · I Kontak(identitas) · J Masukan(anonim) · K Kronologi(anonim) · L Kontak(anonim)
```

Tab `Whistleblower`, 15 kolom A-O:
```
A Timestamp · B CaseID · C Kategori · D SaudaraAdalah · E UnitKerja
F PihakTerlibat · G IsAnonim · H Nama · I NIM · J Kontak
K Detail · L Kronologi · M Status · N CatatanPublik · O StatusUpdatedAt
```

Kolom M-O ditambahkan di PR #3 (backward-compat: row lama tanpa kolom ini akan di-treat sebagai status "Diterima" via `normalizeStatusCell` di `sheets.ts:672`).

Tab `Units`, 3 kolom: `id, fakultas, prodi, isActive`. Dikelola admin di `/report/units`.

## Known pre-existing minor issues (BUKAN bug, awareness saja)

1. **/lacak timezone**: `lacak-client.tsx::formatTimestamp()` tidak set `timeZone: "Asia/Jakarta"`, jadi nampilin jam UTC sementara dashboard nampilin WIB. Tanggalnya benar di kedua tempat. Fix: tambahkan `timeZone: "Asia/Jakarta"` ke options-nya.

2. **Saran append schema quirk**: `appendSubmission` di `sheets.ts:414` pakai `range: "A:L"` tanpa nama tab. Sheets API kadang nempel ke kolom J kalau row sebelumnya cuma punya data di J:K (anonim submission). Akibatnya: timestamp bisa appear di kolom J alih-alih A. Cleanup script harus toleran ini (cek timestamp di mana saja, bukan cuma kolom A).

## Gotchas yang sudah di-fix di PR #3

1. **Sticky navbar broken oleh `overflow-x-hidden`**: parent dengan `overflow-x-hidden` membuat element jadi *containing block* untuk sticky descendant. Solusi: pakai `overflow-x-clip` (Tailwind 3.2+) supaya tidak bikin scrolling/containing context.

2. **Dashboard nampilin tanggal salah setelah PATCH status**: `updateWhistleblowerStatus()` kembaliin `"DD/MM/YYYY HH:mm:ss"` ke client. JS `new Date(...)` di browser misinterpret jadi `MM/DD/YYYY` (US locale). Solusi: sheet WRITE tetap pakai format Indonesia (kompatibilitas parser), tapi response API kembalikan `now.toISOString()`.

## Test data yang sudah disepakati untuk dihapus

Kalau menemukan row dengan ciri-ciri ini di sheet, AMAN dihapus:
- Whistleblower: caseId pattern `WB-202605xx-xxxx` dengan detail starting `[TEST DEVIN`
- Saran: timestamp May 10, 2026 dini hari + masukan starting `[TEST DEVIN`

User sudah explicit approve cleanup otomatis via Sheets API selama:
1. Pakai service account credentials (jangan delete pakai akun pribadi)
2. Sortir delete dimension indices DESCENDING
3. Konfirmasi count match dengan apa yang Devin tambah selama tes
