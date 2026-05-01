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

## ☁️ Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: **New Project** → import repo → biarkan semua default.
3. (Opsional) Set env var `NEXT_PUBLIC_GOOGLE_FORM_ID` jika berbeda dari default.
4. Deploy. Domain langsung dapat dipakai untuk menerima masukan publik.

Catatan: route `/api/saran` berjalan di Edge Runtime sehingga cold start sangat
cepat dan kompatibel dengan semua region Vercel.

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
│  ├─ api/saran/route.ts     # Edge route → Google Form
│  ├─ globals.css             # Theme tokens & utilities
│  ├─ layout.tsx              # Root layout + ThemeProvider
│  └─ page.tsx                # Landing + form
├─ components/
│  ├─ saran-form.tsx          # 4-step wizard (komponen utama)
│  ├─ progress-steps.tsx
│  ├─ option-card.tsx
│  ├─ theme-provider.tsx      # Light/Dark/System
│  ├─ theme-toggle.tsx
│  ├─ brand-mark.tsx
│  └─ ui/{button,input,textarea,label}.tsx
└─ lib/
   ├─ form-config.ts          # Entry ids + tipe payload
   └─ utils.ts
```

## 📜 Lisensi

Internal — Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang.
