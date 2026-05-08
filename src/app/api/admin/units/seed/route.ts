import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { seedDefaultUnits } from "@/lib/units";
import { SheetsConfigError } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/units/seed — isi tab Units dengan DEFAULT_UNITS bila masih
 * kosong. Idempoten: tidak akan duplikasi. Cocok untuk one-click setup pertama.
 */
export async function POST() {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(session)) {
    return NextResponse.json({ error: "Tidak terotorisasi." }, { status: 401 });
  }
  try {
    const result = await seedDefaultUnits();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SheetsConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    const message = err instanceof Error ? err.message : "Gagal seed default.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
