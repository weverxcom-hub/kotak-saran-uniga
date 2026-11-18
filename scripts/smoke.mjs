// Smoke test: jalankan `next start` lalu pastikan semua halaman publik
// membalas 200 di kedua bahasa dan header keamanan terpasang.
// Pakai: npm run build && npm run smoke
import { spawn } from "node:child_process";

const PORT = process.env.SMOKE_PORT ?? "3999";
const BASE = `http://127.0.0.1:${PORT}`;
const PAGES = [
  "/",
  "/saran",
  "/whistleblower",
  "/whistleblower/terimakasih?id=WB-20261119-ABCD2345",
  "/lacak",
  "/report/login",
];
const LOCALES = ["id", "en"];

const server = spawn("npx", ["next", "start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
};

async function waitReady() {
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

let failed = 0;
try {
  await waitReady();
  for (const locale of LOCALES) {
    for (const p of PAGES) {
      const res = await fetch(BASE + p, { headers: { cookie: `ksu_locale=${locale}` } });
      const ok = res.status === 200;
      if (!ok) failed++;
      console.log(`${ok ? "OK " : "GAGAL"} ${res.status} [${locale}] ${p}`);
    }
  }
  const h = (await fetch(BASE + "/")).headers;
  for (const name of ["x-frame-options", "x-content-type-options", "referrer-policy"]) {
    const ok = Boolean(h.get(name));
    if (!ok) failed++;
    console.log(`${ok ? "OK " : "GAGAL"} header ${name}`);
  }
  if (/Error:/.test(log)) {
    failed++;
    console.log("GAGAL ada error di log server:\n" + log);
  }
} finally {
  stop();
}
process.exit(failed ? 1 : 0);
