import { LoginPanel } from "@/components/report/login-panel";
import { googleClientId, googleLoginEnabled, passwordLoginEnabled } from "@/lib/admin-access";

// Konfigurasi login dibaca dari environment saat permintaan, bukan saat build.
export const dynamic = "force-dynamic";

/** Hanya izinkan tujuan di dalam situs ini (cegah open redirect). */
function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/report";
  }
  return value;
}

export default function ReportLoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  return (
    <LoginPanel
      googleClientId={googleLoginEnabled() ? googleClientId() : null}
      passwordEnabled={passwordLoginEnabled()}
      next={safeNext(searchParams.next)}
    />
  );
}
