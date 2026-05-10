import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isWhistleblowerStatus,
  SheetsConfigError,
  updateWhistleblowerStatus,
} from "@/lib/sheets";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update status & catatan publik untuk satu baris laporan whistleblower.
 *
 * - Identifikasi baris pakai `rowIndex` (1-indexed termasuk header) yang
 *   admin sudah dapat dari `/api/report/whistleblower/list`. Pendekatan
 *   ini sengaja dipilih agar admin tidak perlu mengirim Case ID lewat
 *   URL (Case ID bisa cukup unik tapi rowIndex lebih cocok untuk
 *   identifier internal Sheets).
 * - Hanya admin yang sudah login (`SESSION_COOKIE_NAME` valid) yang
 *   boleh memanggil endpoint ini.
 * - Body wajib berisi { status, catatanPublik }. Kedua field selalu
 *   ditulis sekaligus supaya server bisa juga update kolom O
 *   (statusUpdatedAt) dengan timestamp sekarang.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { rowIndex: string } },
) {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(session)) {
    return NextResponse.json(
      { error: "Tidak terotorisasi." },
      { status: 401 },
    );
  }

  const rowIndex = Number.parseInt(params.rowIndex ?? "", 10);
  if (!Number.isInteger(rowIndex) || rowIndex < 2) {
    return NextResponse.json(
      { error: "rowIndex tidak valid." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body harus berupa objek." },
      { status: 400 },
    );
  }

  const { status: rawStatus, catatanPublik: rawCatatan } = body as Record<
    string,
    unknown
  >;
  const status = typeof rawStatus === "string" ? rawStatus.trim() : "";
  if (!isWhistleblowerStatus(status)) {
    return NextResponse.json(
      {
        error:
          "Status tidak valid. Pilih salah satu: Diterima / Sedang ditindaklanjuti / Selesai / Ditolak / Tidak relevan.",
      },
      { status: 400 },
    );
  }
  const catatanPublik =
    typeof rawCatatan === "string" ? rawCatatan.trim() : "";
  if (catatanPublik.length > 2000) {
    return NextResponse.json(
      { error: "Catatan publik maksimal 2000 karakter." },
      { status: 400 },
    );
  }

  try {
    const { statusUpdatedAt } = await updateWhistleblowerStatus(rowIndex, {
      status,
      catatanPublik,
    });
    return NextResponse.json({
      ok: true,
      rowIndex,
      status,
      catatanPublik,
      statusUpdatedAt,
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
      err instanceof Error ? err.message : "Gagal menyimpan status.";
    return NextResponse.json(
      { error: `Gagal menyimpan status: ${message}` },
      { status: 502 },
    );
  }
}
