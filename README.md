# Kotak Saran Elektronik — FEB Universitas Gajayana Malang

Versi modern dari **Kotak Saran Elektronik Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang**. UI di-rebuild dari nol dengan Next.js 14, Tailwind CSS, dan animasi modern. Semua masukan disimpan langsung ke **Google Spreadsheet** lewat Google Sheets API — satu sumber data untuk wizard publik (`/`) dan dashboard admin (`/report`).

![hero](public/og.svg)

## ✨ Fitur Antarmuka

- **Wizard 4 langkah** dengan progress bar (Tentang Anda → Privasi → Masukan → Tinjau & Kirim)
- **Conditional anonim**: opsi anonim sepenuhnya, opsi identitas, atau pilih sendiri
- **Validasi inline** + character counter untuk masukan utama
- **Dark / Light / System mode** dengan persist via `localStorage`
- **Animated background blobs** + grid pattern
- **Mobile-first**, responsif penuh hingga >1280px
- **Zero-state ramah** dan halaman terima kasih yang dipersonalisasi
- **i18n Indonesia (id)** sepenuhnya

## 🧠 Arsitektur

```
Browser  →  Next.js POST /api/saran  →  Google Sheets API (append row)
                                              │
                                              ▼
                                       Google Spreadsheet
                                              │
                                              ▼
Admin   →  /report (cookie-protected)  ←  Google Sheets API (read)
```

- Form dikirim ke endpoint internal `/api/saran` dalam format JSON.
- Server memvalidasi payload, lalu append baris baru ke spreadsheet via
  Google Sheets API (`spreadsheets.values.append`) menggunakan service account.
- Skema kolom 12-kolom (A–L) memisahkan jawaban identitas vs anonim, sehingga
  pengelola bisa filter / mengekspor masing-masing tanpa kebocoran identitas.
- Tidak ada database. Tidak ada secret di klien.

## 🛠️ Stack

- **Next.js 14** (App Router, Node.js runtime untuk API yang akses Sheets)
- **`googleapis`** untuk read & write ke Google Sheets via service account
- **TypeScript**, strict mode
- **Tailwind CSS** + design tokens HSL custom (terang/gelap)
- **lucide-react** untuk ikon
- **class-variance-authority** + **tailwind-merge** untuk varian komponen

## 🚀 Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
# → isi REPORT_PASSWORD, REPORT_SHEET_ID, dan kredensial service account
npm run dev
# → http://localhost:3000
```

Lihat tabel env var di section [Admin Dashboard `/report`](#-admin-dashboard-report)
untuk daftar lengkap.

## 📝 Skema Spreadsheet

Sheet pertama harus punya **header row** + 12 kolom berikut (urutan persis):

| Kolom | Header                          | Isi |
| ----- | ------------------------------- | --- |
| A     | `Timestamp`                     | DD/MM/YYYY HH:MM:SS (otomatis di-set saat append) |
| B     | `Saudara adalah`                | DOSEN / MAHASISWA / TENDIK / atau bebas |
| C     | `Unit kerja / Prodi`            | salah satu dari `UNIT_OPTIONS` |
| D     | `Apakah Anonim?`                | `Ya` atau `Tidak` |
| E     | `Nama (jika identitas)`         | hanya diisi bila D=`Tidak` |
| F     | `NIM/NIP (jika identitas)`      | hanya diisi bila D=`Tidak` |
| G     | `Masukan (identitas)`           | hanya diisi bila D=`Tidak` |
| H     | `Kronologi (identitas)`         | hanya diisi bila D=`Tidak` |
| I     | `Kontak (identitas)`            | hanya diisi bila D=`Tidak` |
| J     | `Masukan (anonim)`              | hanya diisi bila D=`Ya` |
| K     | `Kronologi (anonim)`            | hanya diisi bila D=`Ya` |
| L     | `Kontak (anonim)`               | hanya diisi bila D=`Ya` |

Kalau spreadsheet Anda pakai header lain, parser di `lib/sheets.ts` mencoba
mencocokkan via regex (mis. cari kata "Anonim", "Nama", "Masukan"). Tetap
disarankan ikut format di atas supaya konsisten.

Untuk mengganti opsi pertanyaan (Peran / Unit), edit
[`src/lib/form-config.ts`](src/lib/form-config.ts) — itu satu-satunya konfigurasi
yang perlu disesuaikan jika bisnis logic berubah.

## 🛡️ Admin Dashboard `/report`

Halaman `/report` adalah panel rekap masukan untuk pengelola FEB. Halaman ini
dilindungi password sederhana (HMAC-signed cookie session 8 jam) dan membaca
data langsung dari spreadsheet yang sama dengan tempat `/api/saran` menulis.

Fitur:

- 4 stat card: Total Masukan / Dengan Identitas / Anonim / Bulan Aktif
- Filter: pencarian teks, peran, unit/prodi, mode (anonim/identitas), rentang tanggal
- Daftar masukan dengan card list di mobile + tabel di desktop
- Export CSV (UTF-8 BOM agar Excel tidak salah encoding)

### Env var yang dibutuhkan

| Variable | Wajib? | Keterangan |
| --- | --- | --- |
| `REPORT_PASSWORD` | ✅ | Password halaman `/report/login`. Disarankan minimal 12 karakter. |
| `REPORT_SHEET_ID` | ✅ | ID spreadsheet target (bagian URL antara `/d/` dan `/edit`). Sheet ini menyimpan **semua submission** sekaligus jadi sumber `/report`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ (opsi A) | Full JSON service account, single-line stringified. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | ✅ (opsi B) | Alternatif kalau JSON susah di-paste ke Vercel UI (karena multiline `private_key`). Kode support kedua format. |
| `REPORT_SHEET_RANGE` | ❌ | Default `A:Z` di sheet pertama. |
| `REPORT_SESSION_SECRET` | ❌ | HMAC secret untuk cookie. Default fallback ke `REPORT_PASSWORD` (artinya: tiap ganti password, semua session lama otomatis invalid). |

Service account email **wajib** diberi akses **Editor** ke spreadsheet target
supaya bisa `append` baris baru saat user submit. Akses Viewer saja tidak
cukup karena `/api/saran` perlu menulis. Cara grant akses:

1. Buka spreadsheet → klik **Share** (kanan atas)
2. Tempel email service account (contoh `kotak-saran-app@<project>.iam.gserviceaccount.com`)
3. Pilih role **Editor**
4. Hilangkan centang **Notify people** (opsional, service account tidak punya inbox)
5. Klik **Share**

### Mengganti password `/report`

Password 100% berbasis env var — **tidak ada hardcoded value di kode**. Untuk
mengganti:

1. Buka [Vercel → Project Settings → Environment Variables](https://vercel.com/dashboard).
2. Edit `REPORT_PASSWORD` → ganti dengan nilai baru.
3. Centang scope **Production + Preview + Development** sesuai kebutuhan.
4. Save → masuk ke tab **Deployments** → deployment terakhir → **Redeploy**
   (centang "Use existing Build Cache" untuk redeploy cepat tanpa rebuild).
5. Setelah deployment hijau, password lama langsung ditolak dan **semua
   session yang masih login otomatis di-logout** (karena cookie HMAC dihitung
   ulang dengan secret baru).

Password tidak pernah masuk ke repo / git history. Jangan commit `.env.local`.

## ☁️ Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: **New Project** → import repo → biarkan semua default.
3. Set env var (lihat [tabel di atas](#env-var-yang-dibutuhkan)):
   `REPORT_PASSWORD`, `REPORT_SHEET_ID`, dan kredensial service account.
4. Pastikan service account email punya akses **Editor** ke spreadsheet target.
5. Deploy. Domain langsung dapat dipakai untuk menerima masukan publik dan login `/report`.

Catatan: API route berjalan di Node.js Runtime karena memakai library
`googleapis` (tidak edge-compatible).

## 🔐 Privasi

- Submisi anonim **tidak** mengirim field nama/NIM, hanya field anonymous yang
  dikirim ke Google Form.
- Tidak ada cookie / pelacak / analytics di proyek ini secara default.
- Validasi dasar (panjang minimum, opsi terdaftar) dijalankan di server agar
  spam dan salah-input dasar bisa ditolak sebelum mencapai Google.

## 📁 Struktur Proyek

```
src/
├─ app/
│  ├─ api/
│  │  ├─ saran/route.ts             # POST → append row ke Google Sheets
│  │  └─ report/
│  │     ├─ login/route.ts          # POST login + DELETE logout
│  │     ├─ list/route.ts           # GET semua baris (cookie-protected)
│  │     └─ export/route.ts         # GET CSV (cookie-protected)
│  ├─ report/
│  │  ├─ login/page.tsx             # Form login /report/login
│  │  └─ page.tsx                   # Dashboard rekap (filter + stats + CSV)
│  ├─ globals.css                   # Theme tokens & utilities
│  ├─ layout.tsx                    # Root layout + ThemeProvider
│  └─ page.tsx                      # Landing + form
├─ components/
│  ├─ saran-form.tsx                # 4-step wizard (komponen utama)
│  ├─ progress-steps.tsx
│  ├─ option-card.tsx
│  ├─ theme-provider.tsx            # Light/Dark/System
│  ├─ theme-toggle.tsx
│  ├─ brand-mark.tsx                # UNIGA emblem
│  ├─ site-footer.tsx               # "Develop with ❤️ by weverx.com" footer
│  └─ ui/{button,input,textarea,label}.tsx
└─ lib/
   ├─ form-config.ts                # Opsi peran/unit + tipe payload
   ├─ sheets.ts                     # Google Sheets API (read + append) + Indonesian date parsing
   ├─ session.ts                    # HMAC cookie session helper
   └─ utils.ts
```

## 📜 Lisensi

Internal — Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang.
