# Test Report — Modern Kotak Saran FEB UNIGA

**Tanggal:** 1 Mei 2026
**Versi:** v0.1.0 (initial modernization)
**Tester:** Devin (otomatis)
**Backend:** Google Form `1FAIpQLSeIAV4B8E9sUkgDUqqo0e9Z9kMmlruKDSU6sTtk6AKlZFs-Sw`

## Hasil Ringkas

| # | Skenario | Hasil |
|---|----------|-------|
| 1 | Render hero, theme toggle, dan step 1 (light mode) | PASS |
| 2 | Pilih peran (MAHASISWA) + unit (MANAJEMEN) → lanjut ke step 2 | PASS |
| 3 | Pilih "Tetap dengan identitas saya" → conditional Identitas panel muncul | PASS |
| 4 | Step 3 Masukan: validasi min 10 karakter + counter | PASS |
| 5 | Step 4 Tinjau: ringkasan menampilkan semua field benar | PASS |
| 6 | POST `/api/saran` (identitas) → success screen personalised | PASS |
| 7 | Theme toggle → dark mode aktif di seluruh halaman | PASS |
| 8 | Mode anonim: Identitas panel TIDAK muncul, tinjau hanya 4 baris | PASS |
| 9 | POST `/api/saran` (anonim) → success screen "responden anonim" | PASS |

## Bukti Visual

### Step 1 — Tentang Anda
![step1](https://app.devin.ai/attachments/4a9d13de-851a-4559-92ac-faea5068abf3/screenshot_11245f0d895e42dca0678f4cb3d406bd.png)

### Step 2 — Privasi (panel Identitas muncul saat "Tidak anonim")
![step2-identitas](https://app.devin.ai/attachments/07ddfe29-77a2-4150-bac7-ce58a60013e5/screenshot_d842622d21d14350857ef3855ad3c9d0.png)

### Step 4 — Tinjau & Kirim (mode identitas)
![review](https://app.devin.ai/attachments/ec9df6b5-d0ad-4b5b-b90c-ec489c1db62c/screenshot_0e6582b9a689472e944db3e702ff1a9e.png)

### Success — terkirim ke Google Form
![success](https://app.devin.ai/attachments/dbd1d1a4-7eda-4218-9ce9-6968ec323b23/screenshot_9c72383541c8437cb25f0ba853ac623d.png)

### Dark mode
![dark](https://app.devin.ai/attachments/b3878c72-b970-4b3f-a941-2b16ec3ec1d4/screenshot_37785fb8028a4a2fa7799bd5c835ce6d.png)

### Mode Anonim — review tanpa NAMA/NIM
![anonim-review](https://app.devin.ai/attachments/368892a1-4e11-425f-86c5-d4969a148613/screenshot_9f4649ea3eb541669c2889277728870b.png)

### Success Anonim
![anonim-success](https://app.devin.ai/attachments/720ba805-ca55-4c1c-9384-67dbfa01a034/screenshot_54d604084c64456d9bace0c02c4884cc.png)

## Catatan untuk QA Lanjutan

- Selama pengujian, **2 entri "Tes Devin"** terkirim ke Google Spreadsheet.
  Silakan hapus jika perlu (1 dengan nama "Aditya Pratama (Devin Test)" mode
  identitas + 1 anonim DOSEN/EKONOMI PEMBANGUNAN).
- Belum diuji: form di viewport mobile <640px (CSS di-design responsif tapi
  layak diverifikasi langsung).
- Belum diuji: rate-limiting / abuse — form publik tanpa CAPTCHA (Google Form
  tidak ada CAPTCHA juga di versi aslinya). Bisa ditambahkan Cloudflare
  Turnstile jika dibutuhkan ke depan.
