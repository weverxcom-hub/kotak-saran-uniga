# Suara UNIGA Malang — Kotak Saran Elektronik Tingkat Universitas

**Suara UNIGA Malang** adalah versi **tingkat universitas** dari Kotak Saran Elektronik. Default branding diisi untuk **Universitas Gajayana Malang** (disingkat "UNIGA Malang" — selalu disertai "Malang" supaya tidak bertabrakan dengan kampus lain yang juga memakai singkatan UNIGA). Domain default-nya `suara.unigamalang.ac.id`. Seluruh teks, nama, logo, dan domain bisa di-override lewat env var `NEXT_PUBLIC_*` — sehingga satu codebase dapat di-deploy ulang untuk kampus lain tanpa edit kode.

UI dibangun dengan Next.js 14, Tailwind CSS, dan animasi modern. Semua data disimpan di **Google Spreadsheet** lewat Google Sheets API — termasuk **daftar fakultas/prodi yang dinamis** (admin bisa tambah / edit / nonaktifkan unit langsung dari halaman `/report/units`, tanpa redeploy).

Endpoint utama:

- `/` — wizard kotak saran (cascade Fakultas → Prodi)
- `/whistleblower` — saluran pelaporan pelanggaran serius (Case ID)
- `/report` — dashboard admin (login password)
- `/report/units` — admin: kelola daftar fakultas / prodi

## Fitur Antarmuka

- **Wizard 4 langkah** dengan progress bar (Tentang Anda → Privasi → Masukan → Tinjau & Kirim)
- **Cascade dropdown Fakultas → Prodi** dengan data dinamis dari Google Sheets
- **Conditional anonim**: opsi anonim sepenuhnya, opsi identitas, atau pilih sendiri
- **Validasi inline** + character counter untuk masukan utama
- **Dark / Light / System mode** dengan persist via `localStorage`
- **Mobile-first**, responsif penuh hingga >1280px
- **i18n Indonesia (id)** sepenuhnya

## Arsitektur

```
Browser  →  POST /api/saran          →  Google Sheets API (append row)
Browser  →  POST /api/whistleblower  →  Google Sheets API (append row, tab Whistleblower)
Browser  →  GET  /api/units          →  Google Sheets API (read tab Units)
Admin    →  /report (cookie-protected)        ←  Google Sheets API (read submissions)
Admin    →  /report/units (cookie-protected)  ↔  Google Sheets API (CRUD tab Units)
```

- Form publik fetch daftar fakultas/prodi dari `/api/units` saat load (cache di server ~60 detik).
- Server memvalidasi setiap submission terhadap daftar Units yang aktif — submission dengan kombinasi yang tidak terdaftar akan ditolak.
- Tidak ada database. Tidak ada secret di klien.

## Stack

- **Next.js 14** (App Router, Node.js runtime untuk API yang akses Sheets)
- **`googleapis`** untuk read & write ke Google Sheets via service account
- **TypeScript**, strict mode
- **Tailwind CSS** + design tokens HSL custom (terang/gelap)
- **lucide-react** untuk ikon

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
# → isi REPORT_PASSWORD, REPORT_SHEET_ID, dan kredensial service account
# → (opsional) override NEXT_PUBLIC_UNIVERSITY_NAME / SHORT / LOGO_PATH dst
npm run dev
# → http://localhost:3000
```

## Konfigurasi branding (single-source)

Seluruh nama universitas, singkatan, tagline, logo, dan email kontak ada di
[`src/lib/site-config.ts`](src/lib/site-config.ts). Semua field bisa di-override
lewat env var `NEXT_PUBLIC_*` (lihat `.env.example`). Contoh untuk redeploy ke
kampus lain — cukup set env var berikut di Vercel dan redeploy:

```
NEXT_PUBLIC_SITE_NAME=Suara UCN
NEXT_PUBLIC_UNIVERSITY_NAME=Universitas Contoh Nusantara
NEXT_PUBLIC_UNIVERSITY_SHORT=UCN
NEXT_PUBLIC_SITE_TAGLINE=Saluran resmi saran, kritik, & whistleblower
NEXT_PUBLIC_APP_DOMAIN=suara.ucn.ac.id
NEXT_PUBLIC_LOGO_PATH=/img/ucn-logo.png
NEXT_PUBLIC_LOGO_OG_PATH=/img/ucn-logo@2x.png
NEXT_PUBLIC_UNIVERSITY_URL=https://ucn.ac.id
NEXT_PUBLIC_CONTACT_EMAIL=humas@ucn.ac.id
```

Logo: simpan file ke `public/img/<slug>-logo.png` (≥ 256×256, PNG transparan
disarankan). Untuk OpenGraph tambahkan versi `@2x` (≥ 440×440).

## Daftar fakultas / prodi (dinamis)

Admin mengelola daftar Fakultas + Prodi langsung dari halaman
**`/report/units`** (login pakai `REPORT_PASSWORD`). Data disimpan di tab
**`Units`** pada spreadsheet utama (`REPORT_SHEET_ID`) dengan skema 5 kolom:

| Kolom | Header | Isi |
| ----- | ------ | --- |
| A | `Fakultas` | nama fakultas (mis. `FAKULTAS EKONOMI DAN BISNIS`) |
| B | `Prodi` | nama prodi; **kosongkan** untuk entri level fakultas |
| C | `Aktif` | `Ya` (default) atau `Tidak` (soft delete) |
| D | `Catatan` | bebas, opsional |
| E | `UpdatedAt` | timestamp ISO (otomatis) |

Tab `Units` dibuat otomatis saat admin pertama kali menyimpan unit. Perubahan
langsung tampil di form publik (cache server ~60 detik). Tidak ada
hard-delete: nonaktifkan dengan toggle `Aktif`.

Cascade dropdown:

- Pilihan **Fakultas** menampilkan seluruh fakultas unik yang aktif.
- Pilihan **Prodi** otomatis difilter berdasarkan fakultas yang dipilih.
- Bila satu fakultas memiliki entri level fakultas (Prodi kosong) **dan**
  prodi-prodinya, dropdown prodi menambahkan opsi `(Tingkat fakultas saja)`.

Semua submission divalidasi di server terhadap daftar aktif — kombinasi
fakultas/prodi yang tidak terdaftar akan ditolak (mencegah spam / typo).

## Skema spreadsheet — submission saran (12 kolom A–L)

Sheet pertama harus punya **header row** + 12 kolom berikut (urutan persis):

| Kolom | Header                          | Isi |
| ----- | ------------------------------- | --- |
| A     | `Timestamp`                     | DD/MM/YYYY HH:MM:SS (otomatis di-set saat append) |
| B     | `Saudara adalah`                | DOSEN / MAHASISWA / TENDIK / atau bebas |
| C     | `Unit kerja / Prodi`            | label gabungan `<Fakultas> — <Prodi>` (atau hanya fakultas) |
| D     | `Apakah Anonim?`                | `Ya` atau `Tidak` |
| E     | `Nama (jika identitas)`         | hanya diisi bila D=`Tidak` |
| F     | `NIM/NIP (jika identitas)`      | hanya diisi bila D=`Tidak` |
| G     | `Masukan (identitas)`           | hanya diisi bila D=`Tidak` |
| H     | `Kronologi (identitas)`         | hanya diisi bila D=`Tidak` |
| I     | `Kontak (identitas)`            | hanya diisi bila D=`Tidak` |
| J     | `Masukan (anonim)`              | hanya diisi bila D=`Ya` |
| K     | `Kronologi (anonim)`            | hanya diisi bila D=`Ya` |
| L     | `Kontak (anonim)`               | hanya diisi bila D=`Ya` |

## Admin Dashboard `/report`

Halaman `/report` adalah panel rekap masukan untuk pengelola kampus. Halaman
ini dilindungi password sederhana (HMAC-signed cookie session 8 jam) dan
membaca data langsung dari spreadsheet yang sama dengan tempat `/api/saran`
menulis. Login yang sama juga melindungi `/report/whistleblower` dan
`/report/units`.

Fitur:

- 4 stat card: Total Masukan / Dengan Identitas / Anonim / Bulan Aktif
- Filter: pencarian teks, peran, unit/prodi, mode (anonim/identitas), rentang tanggal
- Daftar masukan dengan card list di mobile + tabel di desktop
- Export CSV (UTF-8 BOM agar Excel tidak salah encoding) — nama file otomatis
  pakai slug singkatan kampus

### Env var yang dibutuhkan

| Variable | Wajib? | Keterangan |
| --- | --- | --- |
| `REPORT_PASSWORD` | wajib | Password halaman `/report/login`. Disarankan minimal 12 karakter. |
| `REPORT_SHEET_ID` | wajib | ID spreadsheet target (bagian URL antara `/d/` dan `/edit`). Sheet ini menyimpan **semua submission** sekaligus jadi sumber `/report` dan tab `Units`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | wajib (opsi A) | Full JSON service account, single-line stringified. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | wajib (opsi B) | Alternatif kalau JSON susah di-paste ke Vercel UI (karena multiline `private_key`). Kode support kedua format. |
| `REPORT_SHEET_RANGE` | opsional | Default `A:Z` di sheet pertama. |
| `REPORT_SESSION_SECRET` | opsional | HMAC secret untuk cookie. Default fallback ke `REPORT_PASSWORD`. |
| `NEXT_PUBLIC_SITE_NAME` / `_UNIVERSITY_NAME` / `_SHORT` / `_LOGO_PATH` / `_APP_DOMAIN` / dst. | opsional | Override branding untuk redeploy multi-kampus. |

Service account email **wajib** diberi akses **Editor** ke spreadsheet target
supaya bisa `append` baris baru saat user submit, dan menulis ke tab `Units`
saat admin mengelola unit.

## Saluran Whistleblower (`/whistleblower`)

Saluran terpisah untuk **laporan pelanggaran serius** (korupsi, kekerasan,
kecurangan akademik, dll). Disimpan di tab **`Whistleblower`** pada
**spreadsheet yang sama** dengan kotak saran (env var `REPORT_SHEET_ID`).
Tab dibuat otomatis oleh API saat laporan pertama masuk.

### Perbedaan dengan kotak saran

| Aspek | Kotak Saran (`/`) | Whistleblower (`/whistleblower`) |
| --- | --- | --- |
| Tujuan | Saran perbaikan layanan | Lapor pelanggaran (etik / hukum) |
| Default privasi | Identitas | **Anonim** (direkomendasikan) |
| Field tambahan | — | Kategori (wajib) + Pihak Terlibat (opsional) |
| Tracking | — | **Case ID** `WB-YYYYMMDD-XXXX` |
| Dashboard admin | `/report` | `/report/whistleblower` |
| Tab spreadsheet | `Sheet1` (default) | `Whistleblower` (auto-create) |

Login dashboard pakai **password yang sama** dengan `/report`
(env var `REPORT_PASSWORD`). Tab navigasi di kepala halaman menjembatani
keduanya, plus tab `Kelola Unit / Prodi`.

### Skema kolom tab `Whistleblower` (12 kolom A–L)

| Kolom | Field |
| --- | --- |
| A | Timestamp |
| B | Case ID (`WB-YYYYMMDD-XXXX`) |
| C | Kategori |
| D | Saudara adalah |
| E | Unit kerja / Prodi |
| F | Pihak Terlibat |
| G | Apakah Anonim? (`Ya` / `Tidak`) |
| H | Nama (jika identitas) |
| I | NIM/NIP (jika identitas) |
| J | Kontak (jika identitas) |
| K | Detail Pelaporan |
| L | Kronologi & Bukti |

> Bila pelapor memilih **Anonim**, kolom H–J kosong. Detail (K) dan Kronologi
> (L) tetap terisi tanpa peduli mode.

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Di Vercel: **New Project** → import repo → biarkan semua default.
3. Set env var: `REPORT_PASSWORD`, `REPORT_SHEET_ID`, dan kredensial service account.
4. (Opsional) override `NEXT_PUBLIC_UNIVERSITY_*` untuk redeploy multi-kampus.
5. Pastikan service account email punya akses **Editor** ke spreadsheet target.
6. Deploy.

API route berjalan di Node.js Runtime karena memakai library `googleapis`
(tidak edge-compatible).

## Struktur Proyek

```
src/
├─ app/
│  ├─ api/
│  │  ├─ saran/route.ts                 # POST kotak saran
│  │  ├─ whistleblower/route.ts         # POST whistleblower
│  │  ├─ units/route.ts                 # GET daftar Units (publik, cached)
│  │  ├─ admin/units/route.ts           # POST/GET admin (kelola Units)
│  │  ├─ admin/units/[rowIndex]/route.ts# PUT/DELETE per baris
│  │  ├─ admin/units/seed/route.ts      # POST seed default fakultas
│  │  └─ report/...
│  ├─ report/
│  │  ├─ login/page.tsx                 # /report/login
│  │  ├─ page.tsx                       # Dashboard rekap saran
│  │  ├─ whistleblower/page.tsx         # Dashboard rekap WB
│  │  └─ units/page.tsx                 # Admin: kelola fakultas/prodi
│  ├─ whistleblower/
│  │  ├─ page.tsx                       # Form publik laporan WB
│  │  └─ terimakasih/page.tsx           # Halaman Case ID
│  ├─ layout.tsx                        # Root layout + ThemeProvider
│  └─ page.tsx                          # Landing + form saran
├─ components/
│  ├─ saran-form.tsx                    # 4-step wizard saran (cascade Fak → Prodi)
│  ├─ whistleblower-form.tsx            # Form WB (default anonim)
│  ├─ report/units-manager.tsx          # CRUD UI fakultas/prodi
│  ├─ brand-mark.tsx                    # Logo (dari SITE_CONFIG)
│  └─ ...
└─ lib/
   ├─ site-config.ts                    # Branding (single source of truth)
   ├─ form-config.ts                    # ROLE_OPTIONS + tipe payload
   ├─ units.ts                          # CRUD + cache + validator daftar Units
   ├─ whistleblower-config.ts           # Kategori WB + tipe payload
   ├─ sheets.ts                         # Sheets API (read+append) saran & WB
   ├─ auth.ts                           # HMAC cookie session helper
   └─ utils.ts
```

## Lisensi

Internal — Universitas Gajayana Malang. Untuk pemakaian di kampus lain, lihat
[Konfigurasi branding](#konfigurasi-branding-single-source).
