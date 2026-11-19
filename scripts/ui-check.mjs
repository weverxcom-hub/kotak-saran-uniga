// Pemeriksa tampilan otomatis: buka semua halaman (publik + panel pengelola)
// di mode TERANG dan GELAP, lebar desktop dan HP, lalu gagal kalau ada:
//   - teks / isi kontrol form dengan kontras di bawah WCAG AA
//     (4.5 teks biasa, 3 teks besar, 3 placeholder);
//   - <select>/<input>/<textarea> tanpa latar sendiri (jatuh ke warna browser);
//   - halaman yang bisa digeser ke samping (overflow horizontal).
//
// Data panel pengelola memakai data tiruan (API di-mock), jadi tidak butuh
// Google Sheets. Sesi login dibuat dengan rahasia khusus test.
//
// Pakai:
//   npm run build && npm run ui-check          # jalankan next start sendiri
//   UI_CHECK_BASE=http://host:port UI_CHECK_CDP=http://127.0.0.1:9223 \
//     UI_CHECK_SECRET=... npm run ui-check     # pakai server & Chrome yang ada
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { chromium } from "playwright";

const SECRET = process.env.UI_CHECK_SECRET ?? "ui-check-secret";
const ADMIN = process.env.UI_CHECK_ADMIN ?? "ui-check@example.com";
const PORT = process.env.UI_CHECK_PORT ?? "3998";
const BASE = process.env.UI_CHECK_BASE ?? `http://127.0.0.1:${PORT}`;
const PAGES = [
  "/",
  "/saran",
  "/whistleblower",
  "/lacak",
  "/report/login",
  "/report",
  "/report/whistleblower",
  "/report/units",
];
const SCHEMES = ["light", "dark"];
const WIDTHS = [1366, 390];

function sessionToken() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const msg = `v2.${exp}.${Buffer.from(ADMIN).toString("base64url")}`;
  return `${msg}.${createHmac("sha256", SECRET).update(msg).digest("base64url")}`;
}

// ── Data tiruan untuk panel pengelola ─────────────────────────────────────
const roles = ["Mahasiswa", "Dosen", "Tenaga Kependidikan"];
const unitNames = [
  "FAKULTAS EKONOMI DAN BISNIS — MANAJEMEN",
  "FAKULTAS TEKNIK DAN INFORMATIKA — SISTEM INFORMASI",
  "Rektorat",
];
const count = (rows, key) =>
  rows.reduce((a, r) => ((a[r[key]] = (a[r[key]] || 0) + 1), a), {});
const months = [
  { month: "2026-10", count: 3 },
  { month: "2026-11", count: 3 },
];
const saran = Array.from({ length: 6 }, (_, i) => {
  const anon = i % 3 === 0;
  const m = `Contoh masukan ${i + 1}: AC di ruang kuliah sering mati.`;
  return {
    rowIndex: i + 2,
    timestamp: new Date(Date.UTC(2026, 9 + (i % 2), 1 + i)).toISOString(),
    saudaraAdalah: roles[i % 3],
    unitKerja: unitNames[i % 3],
    isAnonim: anon ? "Ya" : "Tidak",
    nama: anon ? "" : `Mahasiswa ${i}`,
    nim: anon ? "" : `2210${i}`,
    masukanIdentitas: anon ? "" : m,
    kronologiIdentitas: "",
    kontakIdentitas: "",
    masukanAnonim: anon ? m : "",
    kronologiAnonim: "",
    kontakAnonim: "",
    masukan: m,
    kronologi: "",
    kontak: "",
  };
});
const statuses = ["Diterima", "Sedang ditindaklanjuti", "Selesai", "Ditolak / Tidak relevan"];
const wb = Array.from({ length: 4 }, (_, i) => ({
  rowIndex: i + 2,
  timestamp: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
  caseId: `WB-2026110${i + 1}-7KQ4M2X${i}`,
  kategori: ["Pungutan liar", "Pelecehan"][i % 2],
  saudaraAdalah: roles[i % 3],
  unitKerja: unitNames[i % 3],
  pihakTerlibat: "Oknum",
  isAnonim: i % 2 ? "Ya" : "Tidak",
  nama: i % 2 ? "" : "Pelapor",
  nim: "",
  kontak: "",
  detail: "Detail laporan contoh.",
  kronologi: "Kronologi contoh.",
  status: statuses[i],
  catatanPublik: i % 2 ? "Sudah dihubungi." : "",
  statusUpdatedAt: new Date(Date.UTC(2026, 10, 10)).toISOString(),
}));
const MOCKS = {
  "**/api/units": {
    groups: [
      { fakultas: "FAKULTAS EKONOMI DAN BISNIS", hasFacultyLevel: true, prodi: ["MANAJEMEN"] },
      { fakultas: "FAKULTAS TEKNIK DAN INFORMATIKA", hasFacultyLevel: true, prodi: ["SISTEM INFORMASI"] },
    ],
  },
  "**/api/report/list**": {
    rows: saran,
    total: saran.length,
    totalAll: saran.length,
    stats: { total: 6, anonim: 2, identitas: 4, perRole: count(saran, "saudaraAdalah"), perUnit: count(saran, "unitKerja"), perMonth: months },
  },
  "**/api/report/whistleblower/list**": {
    rows: wb,
    total: wb.length,
    totalAll: wb.length,
    stats: { total: 4, anonim: 2, identitas: 2, perKategori: count(wb, "kategori"), perUnit: count(wb, "unitKerja"), perMonth: months },
  },
  "**/api/admin/units": {
    rows: [
      { rowIndex: 2, id: "u1", fakultas: "FAKULTAS EKONOMI DAN BISNIS", prodi: "", aktif: true, urutan: 10 },
      { rowIndex: 3, id: "u2", fakultas: "FAKULTAS EKONOMI DAN BISNIS", prodi: "MANAJEMEN", aktif: false, urutan: 20 },
    ],
  },
};

// ── Pemindai (berjalan di dalam halaman) ──────────────────────────────────
function scanPage() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const blend = (t, b) => ({
    r: t.r * t.a + b.r * (1 - t.a),
    g: t.g * t.a + b.g * (1 - t.a),
    b: t.b * t.a + b.b * (1 - t.a),
    a: 1,
  });
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = stack.length && stack[stack.length - 1].a >= 1 ? stack.pop() : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base);
    return base;
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const issues = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    if (el.closest("[aria-hidden=true], iframe, .sr-only")) continue;
    const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && !/^(checkbox|radio|hidden|submit|button)$/.test(el.type);
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    const text = isField
      ? (el.tagName === "SELECT" ? el.options[el.selectedIndex]?.text : el.value || el.placeholder || "").trim()
      : ownText;
    if (!text) continue;
    const fg0 = parse(s.color);
    if (!fg0) continue;
    const bg = bgOf(el);
    const fg = fg0.a < 1 ? blend(fg0, bg) : fg0;
    const cr = ratio(fg, bg);
    const size = parseFloat(s.fontSize);
    const need = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700) ? 3 : 4.5;
    let ph = null;
    if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.placeholder && !el.value) {
      const p = parse(getComputedStyle(el, "::placeholder").color);
      if (p) ph = ratio(p.a < 1 ? blend(p, bg) : p, bg);
    }
    if (cr >= need && (ph === null || ph >= 3)) continue;
    const key = `${el.tagName}|${text.slice(0, 30)}|${cr.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cls = String(el.className || "").slice(0, 80);
    issues.push(
      `kontras ${cr.toFixed(2)}${ph !== null ? ` (placeholder ${ph.toFixed(2)})` : ""} <${el.tagName.toLowerCase()} class="${cls}"> "${text.slice(0, 40)}"`,
    );
  }
  // Kontrol form harus punya warna latar sendiri; kalau tidak, browser
  // memakai warna bawaannya yang tidak ikut tema.
  for (const el of document.querySelectorAll("select, textarea, input:not([type=checkbox]):not([type=radio]):not([type=hidden])")) {
    const c = parse(getComputedStyle(el).backgroundColor);
    const box = el.getBoundingClientRect();
    if (box.width < 2 || el.closest("[aria-hidden=true]")) continue;
    if (!c || c.a === 0) continue; // transparan = sengaja ikut induk
    const root = parse(getComputedStyle(document.body).backgroundColor);
    if (root && Math.abs(lum(c) - lum(root)) > 0.6) {
      issues.push(`latar kontrol tidak ikut tema: <${el.tagName.toLowerCase()} id="${el.id}"> ${getComputedStyle(el).backgroundColor}`);
    }
  }
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  if (overflow > 1) issues.push(`halaman bisa digeser ke samping ${overflow}px`);
  return issues;
}

// ── Jalankan ──────────────────────────────────────────────────────────────
let server = null;
let log = "";
async function startServer() {
  server = spawn("npx", ["next", "start", "-p", PORT], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: {
      ...process.env,
      REPORT_SESSION_SECRET: SECRET,
      REPORT_ADMIN_EMAILS: ADMIN,
      GOOGLE_OAUTH_CLIENT_ID: "ui-check.apps.googleusercontent.com",
    },
  });
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(BASE + "/");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("server tidak siap:\n" + log);
}
const stop = () => {
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
};

let failures = 0;
let browser;
try {
  if (!process.env.UI_CHECK_BASE) await startServer();
  browser = process.env.UI_CHECK_CDP
    ? await chromium.connectOverCDP(process.env.UI_CHECK_CDP)
    : await chromium.launch();
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 } });
      const host = new URL(BASE).hostname;
      await context.addCookies([{ name: "kotak-saran-session", value: sessionToken(), domain: host, path: "/" }]);
      for (const [pattern, body] of Object.entries(MOCKS)) {
        await context.route(pattern, (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
            : route.continue(),
        );
      }
      // Script Google tidak perlu dimuat saat test.
      await context.route("https://accounts.google.com/**", (r) => r.abort());
      const page = await context.newPage();
      for (const path of PAGES) {
        await page.goto(BASE + path, { waitUntil: "networkidle" });
        if (path.startsWith("/report") && path !== "/report/login" && new URL(page.url()).pathname === "/report/login") {
          failures++;
          console.log(`GAGAL [${scheme} ${width}] ${path}: dialihkan ke login (sesi test tidak diterima)`);
          continue;
        }
        await page.waitForTimeout(300);
        const issues = await page.evaluate(scanPage);
        // Buka satu baris detail (berisi form ubah status) lalu periksa lagi.
        const expander = page.locator("[data-detail-toggle][aria-expanded=false]:visible").first();
        if (path === "/report" || path === "/report/whistleblower") {
          if (await expander.count()) {
            await expander.click();
            await page.waitForTimeout(300);
            for (const i of await page.evaluate(scanPage)) issues.push("[detail terbuka] " + i);
          }
        }
        if (issues.length) {
          failures += issues.length;
          console.log(`GAGAL [${scheme} ${width}] ${path}`);
          for (const i of issues) console.log("   - " + i);
        } else {
          console.log(`OK    [${scheme} ${width}] ${path}`);
        }
      }
      await context.close();
    }
  }
} finally {
  if (browser && !process.env.UI_CHECK_CDP) await browser.close();
  stop();
}
if (failures) {
  console.error(`\n${failures} masalah tampilan ditemukan.`);
  process.exit(1);
}
console.log("\nSemua halaman lolos pemeriksaan kontras & overflow.");
process.exit(0);
