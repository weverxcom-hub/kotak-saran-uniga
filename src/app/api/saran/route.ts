import { NextResponse } from "next/server";
import { ROLE_OPTIONS, type SuggestionPayload } from "@/lib/form-config";
import { appendSubmission, SheetsConfigError } from "@/lib/sheets";
import {
  fetchActiveUnits,
  formatUnitLabel,
  isValidUnit,
} from "@/lib/units";

export const runtime = "nodejs";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

type ValidatedPayload = SuggestionPayload & {
  /** Label gabungan "FAKULTAS — PRODI" untuk disimpan di kolom unitKerja. */
  unitLabel: string;
};

async function validate(
  input: unknown,
): Promise<ValidatedPayload | { error: string }> {
  if (!input || typeof input !== "object") return { error: "Body tidak valid." };
  const body = input as Record<string, unknown>;

  const saudaraAdalah = isString(body.saudaraAdalah)
    ? body.saudaraAdalah.trim()
    : "";
  if (!saudaraAdalah) return { error: "Field 'Saudara adalah' wajib diisi." };
  if (saudaraAdalah.length > 100)
    return { error: "Field 'Saudara adalah' terlalu panjang." };

  // Backward-compat: terima `unitKerja` (label gabungan) ATAU `fakultas` + `prodi`.
  let fakultas = isString(body.fakultas) ? body.fakultas.trim() : "";
  let prodi = isString(body.prodi) ? body.prodi.trim() : "";
  if (!fakultas && isString(body.unitKerja)) {
    const label = body.unitKerja.trim();
    const sep = label.indexOf(" — ");
    if (sep > 0) {
      fakultas = label.slice(0, sep).trim();
      prodi = label.slice(sep + 3).trim();
    } else {
      fakultas = label;
      prodi = "";
    }
  }
  if (!fakultas) return { error: "Fakultas wajib dipilih." };

  let units;
  try {
    units = await fetchActiveUnits();
  } catch (err) {
    if (err instanceof SheetsConfigError) throw err;
    return {
      error:
        "Gagal memvalidasi unit / prodi. Coba lagi sebentar atau hubungi pengelola.",
    };
  }
  if (!isValidUnit(units, fakultas, prodi || undefined)) {
    return {
      error:
        "Kombinasi Fakultas / Prodi tidak ada di daftar resmi. Mohon pilih dari daftar.",
    };
  }

  const isAnonim =
    body.isAnonim === "Ya" ? "Ya" : body.isAnonim === "Tidak" ? "Tidak" : null;
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

  if (nama.length > 200) return { error: "Nama terlalu panjang." };
  if (nim.length > 60) return { error: "NIM/NIDN/NIS terlalu panjang." };
  if (kronologi.length > 5000)
    return { error: "Kronologi terlalu panjang (maks 5000 karakter)." };
  if (kontak.length > 60) return { error: "Nomor kontak terlalu panjang." };

  // saudaraAdalah boleh free-text di luar ROLE_OPTIONS — void supaya tree-shake
  // tidak buang import.
  void ROLE_OPTIONS;

  return {
    saudaraAdalah,
    fakultas,
    prodi: prodi || undefined,
    unitLabel: formatUnitLabel(fakultas, prodi),
    isAnonim,
    nama: nama || undefined,
    nim: nim || undefined,
    masukan,
    kronologi: kronologi || undefined,
    kontak: kontak || undefined,
  };
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }

  let validated: ValidatedPayload | { error: string };
  try {
    validated = await validate(json);
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
    const message = err instanceof Error ? err.message : "Validasi gagal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    await appendSubmission({
      saudaraAdalah: validated.saudaraAdalah,
      unitKerja: validated.unitLabel,
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
