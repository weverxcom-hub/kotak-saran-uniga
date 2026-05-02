import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
          "Password report belum dikonfigurasi (REPORT_PASSWORD belum di-set di environment).",
      },
      { status: 500 },
    );
  }
  if (!checkPassword(password)) {
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
