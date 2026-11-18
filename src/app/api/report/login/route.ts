import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { rateLimited } from "@/lib/api-response";
import { RULES } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Maks 5 percobaan per 15 menit per IP (dihitung semua percobaan,
  // bukan hanya yang gagal) supaya password tidak bisa ditebak beruntun.
  const limited = rateLimited(req, RULES.login);
  if (limited) return limited;

  let body: { password?: unknown } | null = null;
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Body harus JSON dengan field password." },
      { status: 400 },
    );
  }
  const password = typeof body?.password === "string" ? body.password : "";
  if (!process.env.REPORT_PASSWORD) {
    return NextResponse.json(
      {
        error:
          "Login admin belum dikonfigurasi. Hubungi pengelola sistem.",
      },
      { status: 500 },
    );
  }
  if (!checkPassword(password)) {
    // Jeda kecil memperlambat tebakan otomatis.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json(
      { error: "Password salah." },
      { status: 401 },
    );
  }
  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
