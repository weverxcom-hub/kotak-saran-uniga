/**
 * Siapa yang boleh masuk panel pengelola.
 *
 * - REPORT_ADMIN_EMAILS: daftar email Google yang diizinkan, dipisah koma.
 *   Contoh: "a@unigamalang.ac.id, b@unigamalang.ac.id". Huruf besar/kecil
 *   tidak dibedakan.
 * - GOOGLE_OAUTH_CLIENT_ID: Client ID "Web application" dari Google Cloud.
 *   Bukan rahasia (ikut terkirim ke browser).
 *
 * Kalau keduanya terisi, login Google aktif dan login password dimatikan
 * (kecuali REPORT_PASSWORD_LOGIN=1 untuk keadaan darurat).
 */

export function adminEmails(): string[] {
  return (process.env.REPORT_ADMIN_EMAILS ?? "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export function googleClientId(): string | null {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  return id ? id : null;
}

export function googleLoginEnabled(): boolean {
  return googleClientId() !== null && adminEmails().length > 0;
}

export function passwordLoginEnabled(): boolean {
  if (!process.env.REPORT_PASSWORD) return false;
  if (!googleLoginEnabled()) return true;
  return process.env.REPORT_PASSWORD_LOGIN === "1";
}
