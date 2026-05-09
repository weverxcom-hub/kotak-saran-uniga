import { NextResponse } from "next/server";
import {
  fetchWhistleblowerPublicStatus,
  SheetsConfigError,
} from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint publik untuk lookup status laporan whistleblower berdasarkan
 * Case ID. SENGAJA hanya mengembalikan field yang aman (status, catatan
 * publik, kategori, tanggal lapor + tanggal update). Detail pelaporan,
 * identitas, dan kontak TIDAK pernah dikirim ke client supaya kalau Case
 * ID bocor, isi laporannya tetap rahasia.
 *
 * Format Case ID standar: WB-YYYYMMDD-XXXX (mis. WB-20260509-A4F1).
 * Toleransi spasi dan kapitalisasi.
 */
export async function GET(
  _req: Request,
  { params }: { params: { caseId: string } },
) {
  const raw = decodeURIComponent(params.caseId ?? "").trim();
  if (!raw) {
    return NextResponse.json(
      { error: "Case ID kosong." },
      { status: 400 },
    );
  }
  // Normalisasi sederhana: izinkan huruf, angka, dan tanda hubung.
  if (!/^[A-Za-z0-9-]{4,40}$/.test(raw)) {
    return NextResponse.json(
      {
        error:
          "Format Case ID tidak valid. Contoh format: WB-20260509-A4F1.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await fetchWhistleblowerPublicStatus(raw);
    if (!result) {
      return NextResponse.json(
        {
          error:
            "Case ID tidak ditemukan. Pastikan kode yang Anda masukkan persis sama dengan yang ditampilkan saat submit laporan.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json(result, {
      headers: {
        // Tidak di-cache di edge, karena status bisa berubah kapan saja.
        "Cache-Control": "no-store",
      },
    });
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
        : "Gagal memuat status laporan.";
    return NextResponse.json(
      { error: `Gagal memuat status: ${message}` },
      { status: 502 },
    );
  }
}
