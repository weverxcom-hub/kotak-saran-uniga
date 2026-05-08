import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { deleteUnit, updateUnit } from "@/lib/units";
import { SheetsConfigError } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { rowIndex: string } };

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

function parseRowIndex(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 2 || !Number.isInteger(n)) return null;
  return n;
}

/**
 * PUT /api/admin/units/[rowIndex] — update unit (semua field).
 */
export async function PUT(req: Request, ctx: Params) {
  if (!requireAuth()) return unauthorized();
  const rowIndex = parseRowIndex(ctx.params.rowIndex);
  if (rowIndex === null)
    return NextResponse.json(
      { error: "rowIndex tidak valid." },
      { status: 400 },
    );
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
  const prodi = isString(obj.prodi) ? obj.prodi.trim() : "";
  const id = isString(obj.id) ? obj.id.trim() : "";
  const aktif = obj.aktif === false ? false : true;
  const urutan =
    typeof obj.urutan === "number" && Number.isFinite(obj.urutan)
      ? Math.trunc(obj.urutan)
      : 9999;
  try {
    await updateUnit(rowIndex, { id, fakultas, prodi, aktif, urutan });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * DELETE /api/admin/units/[rowIndex] — hapus baris permanen.
 */
export async function DELETE(_req: Request, ctx: Params) {
  if (!requireAuth()) return unauthorized();
  const rowIndex = parseRowIndex(ctx.params.rowIndex);
  if (rowIndex === null)
    return NextResponse.json(
      { error: "rowIndex tidak valid." },
      { status: 400 },
    );
  try {
    await deleteUnit(rowIndex);
    return NextResponse.json({ ok: true });
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
