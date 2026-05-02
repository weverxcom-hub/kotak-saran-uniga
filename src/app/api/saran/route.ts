import { NextResponse } from "next/server";
import { ROLE_OPTIONS, UNIT_OPTIONS, type SuggestionPayload } from "@/lib/form-config";
import { appendSubmission, SheetsConfigError } from "@/lib/sheets";

export const runtime = "nodejs";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function validate(input: unknown): SuggestionPayload | { error: string } {
  if (!input || typeof input !== "object") return { error: "Body tidak valid." };
  const body = input as Record<string, unknown>;

  const saudaraAdalah = isString(body.saudaraAdalah)
    ? body.saudaraAdalah.trim()
    : "";
  if (!saudaraAdalah) return { error: "Field 'Saudara adalah' wajib diisi." };

  const unitKerja = isString(body.unitKerja) ? body.unitKerja.trim() : "";
  if (!UNIT_OPTIONS.includes(unitKerja as (typeof UNIT_OPTIONS)[number])) {
    return { error: "Unit kerja tidak valid." };
  }

  const isAnonim = body.isAnonim === "Ya" ? "Ya" : body.isAnonim === "Tidak" ? "Tidak" : null;
  if (!isAnonim) return { error: "Pilihan anonim wajib diisi." };

  const masukan = isString(body.masukan) ? body.masukan.trim() : "";
  if (masukan.length < 10) {
    return { error: "Masukan/saran minimal 10 karakter." };
  }
  if (masukan.length > 5000) {
    return { error: "Masukan/saran maksimal 5000 karakter." };
  }

  const nama = isString(body.nama) ? body.nama.trim() : "";
  const nim = isString(body.nim) ? body.nim.trim() : "";
  const kronologi = isString(body.kronologi) ? body.kronologi.trim() : "";
  const kontak = isString(body.kontak) ? body.kontak.trim() : "";

  if (isAnonim === "Tidak" && !nama) {
    return { error: "Nama wajib diisi jika tidak anonim." };
  }

  // Sanity checks
  if (nama.length > 200) return { error: "Nama terlalu panjang." };
  if (nim.length > 60) return { error: "NIM/NIDN/NIS terlalu panjang." };
  if (kronologi.length > 5000)
    return { error: "Kronologi terlalu panjang (maks 5000 karakter)." };
  if (kontak.length > 60) return { error: "Nomor kontak terlalu panjang." };

  // Allow free-text saudaraAdalah selain ROLE_OPTIONS (sesuai semula).
  void ROLE_OPTIONS;

  return {
    saudaraAdalah,
    unitKerja: unitKerja as (typeof UNIT_OPTIONS)[number],
    isAnonim,
    nama,
    nim,
    masukan,
    kronologi,
    kontak,
  };
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }

  const validated = validate(json);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    await appendSubmission({
      saudaraAdalah: validated.saudaraAdalah,
      unitKerja: validated.unitKerja,
      isAnonim: validated.isAnonim,
      nama: validated.nama,
      nim: validated.nim,
      masukan: validated.masukan,
      kronologi: validated.kronologi,
      kontak: validated.kontak,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsConfigError) {
      return NextResponse.json(
        {
          error:
            err.message +
            " Hubungi pengelola sistem untuk konfigurasi spreadsheet.",
        },
        { status: 500 },
      );
    }
    const message =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat menyimpan ke spreadsheet.";
    return NextResponse.json(
      { error: `Gagal menyimpan ke Spreadsheet: ${message}` },
      { status: 502 },
    );
  }
}
