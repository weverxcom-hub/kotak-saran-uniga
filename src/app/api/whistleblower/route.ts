import { NextResponse } from "next/server";
import {
  WHISTLEBLOWER_CATEGORIES,
  type WhistleblowerPayload,
} from "@/lib/whistleblower-config";
import {
  appendWhistleblowerReport,
  SheetsConfigError,
} from "@/lib/sheets";
import {
  fetchActiveUnits,
  formatUnitLabel,
  isValidUnit,
} from "@/lib/units";

export const runtime = "nodejs";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

type ValidatedPayload = WhistleblowerPayload & {
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

  const kategori = isString(body.kategori) ? body.kategori.trim() : "";
  if (
    !WHISTLEBLOWER_CATEGORIES.includes(
      kategori as (typeof WHISTLEBLOWER_CATEGORIES)[number],
    )
  ) {
    return { error: "Kategori pelanggaran tidak valid." };
  }

  const isAnonim =
    body.isAnonim === "Ya" ? "Ya" : body.isAnonim === "Tidak" ? "Tidak" : null;
  if (!isAnonim) return { error: "Pilihan anonim wajib diisi." };

  const detail = isString(body.detail) ? body.detail.trim() : "";
  if (detail.length < 30) {
    return {
      error:
        "Detail pelaporan minimal 30 karakter — tuliskan apa yang terjadi sejelas mungkin.",
    };
  }
  if (detail.length > 5000)
    return { error: "Detail pelaporan maksimal 5000 karakter." };

  const nama = isString(body.nama) ? body.nama.trim() : "";
  const nim = isString(body.nim) ? body.nim.trim() : "";
  const kontak = isString(body.kontak) ? body.kontak.trim() : "";
  const kronologi = isString(body.kronologi) ? body.kronologi.trim() : "";
  const pihakTerlibat = isString(body.pihakTerlibat)
    ? body.pihakTerlibat.trim()
    : "";

  if (isAnonim === "Tidak" && !nama) {
    return { error: "Nama wajib diisi jika tidak anonim." };
  }

  if (nama.length > 200) return { error: "Nama terlalu panjang." };
  if (nim.length > 60) return { error: "NIM/NIP terlalu panjang." };
  if (kontak.length > 100) return { error: "Kontak terlalu panjang." };
  if (kronologi.length > 5000)
    return { error: "Kronologi terlalu panjang (maks 5000 karakter)." };
  if (pihakTerlibat.length > 500)
    return { error: "Pihak terlibat terlalu panjang." };

  return {
    saudaraAdalah,
    fakultas,
    prodi: prodi || undefined,
    unitLabel: formatUnitLabel(fakultas, prodi),
    kategori: kategori as (typeof WHISTLEBLOWER_CATEGORIES)[number],
    pihakTerlibat: pihakTerlibat || undefined,
    isAnonim,
    nama: nama || undefined,
    nim: nim || undefined,
    kontak: kontak || undefined,
    detail,
    kronologi: kronologi || undefined,
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
    const { caseId, timestamp } = await appendWhistleblowerReport({
      saudaraAdalah: validated.saudaraAdalah,
      unitKerja: validated.unitLabel,
      kategori: validated.kategori,
      pihakTerlibat: validated.pihakTerlibat,
      isAnonim: validated.isAnonim,
      nama: validated.nama,
      nim: validated.nim,
      kontak: validated.kontak,
      detail: validated.detail,
      kronologi: validated.kronologi,
    });
    return NextResponse.json({ ok: true, caseId, timestamp });
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
      { error: `Gagal menyimpan laporan: ${message}` },
      { status: 502 },
    );
  }
}
