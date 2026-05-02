# Kotak Saran Elektronik — FEB Universitas Gajayana Malang

Versi modern dari **Kotak Saran Elektronik Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang**. UI di-rebuild dari nol dengan Next.js 14, Tailwind CSS, dan animasi modern, namun tetap menggunakan **Google Form + Google Spreadsheet** sebagai backend penyimpanan data — sehingga seluruh masukan tetap masuk ke spreadsheet resmi yang sama persis seperti form aslinya.

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
Browser  →  Next.js Server Action (/api/saran)  →  Google Forms (formResponse)
                                                    │
                                                    ▼
                                            Google Spreadsheet
```

- Form dikirim ke endpoint internal `/api/saran` dalam format JSON.
- Server (Edge Runtime) memvalidasi payload, lalu mem-POST ulang ke
  `https://docs.google.com/forms/d/e/<FORM_ID>/formResponse` dengan field `entry.X`
  yang tepat — termasuk handling untuk opsi "Other" dan dua section bercabang
  (IDENTITAS vs ANONYMOUS) sesuai logika section di Google Form aslinya.
- Tidak ada database. Tidak ada secret di klien. Cukup deploy.

## 🛠️ Stack

- **Next.js 14** (App Router, Edge runtime untuk API)
- **TypeScript**, strict mode
- **Tailwind CSS** + design tokens HSL custom (terang/gelap)
- **lucide-react** untuk ikon
- **class-variance-authority** + **tailwind-merge** untuk varian komponen

## 🚀 Menjalankan secara lokal

```bash
npm install
npm run dev
# → http://localhost:3000
```

## 🔧 Konfigurasi

Defaultnya app menggunakan Form ID resmi FEB UNIGA. Untuk mengganti target form
(misal saat menduplikasi spreadsheet untuk staging) cukup set:

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_FORM_ID=1FAIpQLSeIAV4B8E9sUkgDUqqo0e9Z9kMmlruKDSU6sTtk6AKlZFs-Sw
```

Bila Anda mengganti pertanyaan di Google Form, perbarui id `entry.X` di
[`src/lib/form-config.ts`](src/lib/form-config.ts) — tinggal lihat HTML viewform
dan cari atribut `data-params`/`name="entry.XXXX"`.

## 🛡️ Admin Dashboard `/report`

Halaman `/report` adalah panel rekap masukan untuk pengelola FEB. Halaman ini
dilindungi password sederhana (HMAC-signed cookie session 8 jam) dan membaca
data langsung dari spreadsheet jawaban Google Form via Google Sheets API.

Fitur:

- 4 stat card: Total Masukan / Dengan Identitas / Anonim / Bulan Aktif
- Filter: pencarian teks, peran, unit/prodi, mode (anonim/identitas), rentang tanggal
- Daftar masukan dengan card list di mobile + tabel di desktop
- Export CSV (UTF-8 BOM agar Excel tidak salah encoding)

### Env var yang dibutuhkan

| Variable | Wajib? | Keterangan |
| --- | --- | --- |
| `REPORT_PASSWORD` | ✅ | Password halaman `/report/login`. Disarankan minimal 12 karakter. |
| `REPORT_SHEET_ID` | ✅ | ID spreadsheet jawaban Google Form (bagian URL antara `/d/` dan `/edit`). |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ (opsi A) | Full JSON service account, single-line stringified. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | ✅ (opsi B) | Alternatif kalau JSON susah di-paste ke Vercel UI (karena multiline `private_key`). Kode support kedua format. |
| `REPORT_SHEET_RANGE` | ❌ | Default `A:Z` di sheet pertama. |
| `REPORT_SESSION_SECRET` | ❌ | HMAC secret untuk cookie. Default fallback ke `REPORT_PASSWORD` (artinya: tiap ganti password, semua session lama otomatis invalid). |

Service account email harus diberi akses **Viewer** (atau Editor) ke spreadsheet
jawaban — jika tidak Google Sheets API akan balas 404.

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
3. Set env var (lihat tabel di atas untuk halaman `/report`):
   - `NEXT_PUBLIC_GOOGLE_FORM_ID` (opsional, override Form ID default)
   - `REPORT_PASSWORD`, `REPORT_SHEET_ID`, dan kredensial service account
     (kalau ingin halaman `/report` aktif).
4. Deploy. Domain langsung dapat dipakai untuk menerima masukan publik.

Catatan: route `/api/saran` dan API `/report` berjalan di Edge Runtime sehingga
cold start sangat cepat dan kompatibel dengan semua region Vercel.

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
│  │  ├─ saran/route.ts             # Edge route → Google Form
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
   ├─ form-config.ts                # Entry ids + tipe payload
   ├─ sheets.ts                     # Google Sheets API + Indonesian date parsing
   ├─ session.ts                    # HMAC cookie session helper
   └─ utils.ts
```

## 📜 Lisensi

Internal — Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang.
