import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import {
  appendUnit,
  fetchAllUnits,
  type UnitRow,
} from "@/lib/units";
import { SheetsConfigError } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Tidak terotorisasi." }, { status: 401 });
}

function requireAuth(): boolean {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(session);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

/**
 * GET /api/admin/units — list semua unit (termasuk yang non-aktif).
 * Khusus admin /report/units.
 */
export async function GET() {
  if (!requireAuth()) return unauthorized();
  try {
    const units = await fetchAllUnits({ skipCache: true });
    return NextResponse.json({ units });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/admin/units — tambah unit baru.
 * Body: { fakultas: string; prodi?: string; aktif?: boolean; urutan?: number; id?: string }
 */
export async function POST(req: Request) {
  if (!requireAuth()) return unauthorized();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const obj = body as Record<string, unknown>;
  const fakultas = isString(obj.fakultas) ? obj.fakultas.trim() : "";
  if (!fakultas)
    return NextResponse.json(
      { error: "Fakultas wajib diisi." },
      { status: 400 },
    );
  if (fakultas.length > 200)
    return NextResponse.json(
      { error: "Nama fakultas terlalu panjang." },
      { status: 400 },
    );
  const prodi = isString(obj.prodi) ? obj.prodi.trim() : "";
  if (prodi.length > 200)
    return NextResponse.json(
      { error: "Nama prodi terlalu panjang." },
      { status: 400 },
    );
  const id = isString(obj.id) ? obj.id.trim() : undefined;
  const aktif = obj.aktif === false ? false : true;
  const urutan =
    typeof obj.urutan === "number" && Number.isFinite(obj.urutan)
      ? Math.trunc(obj.urutan)
      : 9999;
  try {
    const created: UnitRow = await appendUnit({
      id,
      fakultas,
      prodi,
      aktif,
      urutan,
    });
    return NextResponse.json({ ok: true, unit: created });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): Response {
  if (err instanceof SheetsConfigError) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  const message = err instanceof Error ? err.message : "Gagal memproses.";
  return NextResponse.json({ error: message }, { status: 502 });
}
