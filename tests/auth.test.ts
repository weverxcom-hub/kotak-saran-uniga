import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, readSession, verifySessionToken } from "@/lib/auth";
import { googleLoginEnabled, isAdminEmail, passwordLoginEnabled } from "@/lib/admin-access";

const ADMIN = "rhari.setiawan@unigamalang.ac.id";

describe("akses pengelola", () => {
  beforeEach(() => {
    vi.stubEnv("REPORT_SESSION_SECRET", "rahasia-test");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "123-abc.apps.googleusercontent.com");
    vi.stubEnv("REPORT_ADMIN_EMAILS", ` ${ADMIN.toUpperCase()} , `);
    vi.stubEnv("REPORT_PASSWORD", "pw-lama");
    vi.stubEnv("REPORT_PASSWORD_LOGIN", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("email di daftar diizinkan, huruf besar/kecil tidak dibedakan", () => {
    expect(isAdminEmail(ADMIN)).toBe(true);
    expect(isAdminEmail("orang.lain@unigamalang.ac.id")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("login Google aktif mematikan login password", () => {
    expect(googleLoginEnabled()).toBe(true);
    expect(passwordLoginEnabled()).toBe(false);
    vi.stubEnv("REPORT_PASSWORD_LOGIN", "1");
    expect(passwordLoginEnabled()).toBe(true);
  });

  it("tanpa konfigurasi Google, password tetap jalan", () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    expect(googleLoginEnabled()).toBe(false);
    expect(passwordLoginEnabled()).toBe(true);
  });

  it("sesi email valid, lalu dicabut saat email dihapus dari daftar", () => {
    const token = createSessionToken(ADMIN);
    expect(readSession(token)).toEqual({ email: ADMIN });
    vi.stubEnv("REPORT_ADMIN_EMAILS", "lain@unigamalang.ac.id");
    expect(verifySessionToken(token)).toBe(false);
  });

  it("sesi password lama tidak berlaku saat login Google aktif", () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    const token = createSessionToken(null);
    expect(verifySessionToken(token)).toBe(true);
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "123-abc.apps.googleusercontent.com");
    expect(verifySessionToken(token)).toBe(false);
  });

  it("menolak token yang diubah, kedaluwarsa, atau format lama", () => {
    const token = createSessionToken(ADMIN);
    const [v, exp, subject, sig] = token.split(".");
    const longer = [v, String(Number(exp) + 86400), subject, sig].join(".");
    expect(verifySessionToken(longer)).toBe(false);
    vi.stubEnv("REPORT_ADMIN_EMAILS", `${ADMIN}, x@unigamalang.ac.id`);
    const otherUser = [v, exp, Buffer.from("x@unigamalang.ac.id").toString("base64url"), sig].join(".");
    expect(verifySessionToken(otherUser)).toBe(false);
    expect(verifySessionToken(createSessionToken(ADMIN, -10))).toBe(false);
    expect(verifySessionToken("1999999999.abc")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });
});
