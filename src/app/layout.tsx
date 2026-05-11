import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_CONFIG } from "@/lib/site-config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_URL ||
  `https://${SITE_CONFIG.appDomain}`;

const TITLE_DEFAULT = `${SITE_CONFIG.siteName} — ${SITE_CONFIG.universityName}`;
const TITLE_TEMPLATE = `%s · ${SITE_CONFIG.siteName}`;
const DESCRIPTION = `${SITE_CONFIG.siteName} — saluran resmi untuk menyampaikan saran, kritik, dan laporan whistleblower terkait layanan akademik, non-akademik, dan sarana prasarana ${SITE_CONFIG.universityName}. Identitas dijamin kerahasiaannya.`;
const OG_TITLE = SITE_CONFIG.siteName;
const OG_DESCRIPTION = `Suarakan masukan Anda untuk peningkatan kualitas layanan ${SITE_CONFIG.universityName}.`;

export const metadata: Metadata = {
  metadataBase: new URL(
    SITE_URL.startsWith("http") ? SITE_URL : `https://${SITE_URL}`,
  ),
  title: { default: TITLE_DEFAULT, template: TITLE_TEMPLATE },
  description: DESCRIPTION,
  keywords: [
    SITE_CONFIG.siteName,
    "kotak saran",
    "kotak saran universitas",
    "whistleblower",
    SITE_CONFIG.universityName,
    SITE_CONFIG.universityShort,
    "keluhan",
    "saran mahasiswa",
  ],
  authors: [{ name: SITE_CONFIG.universityName }],
  // Favicon, icon (Android/PWA), dan apple-icon di-auto-discover Next.js dari
  // file `src/app/{favicon.ico,icon.png,apple-icon.png}` — jadi metadata.icons
  // tidak perlu di-set manual. Lihat:
  // https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: "website",
    locale: "id_ID",
    images: [{ url: SITE_CONFIG.logoOgPath, width: 440, height: 440 }],
  },
  twitter: {
    card: "summary",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [SITE_CONFIG.logoOgPath],
  },
};

export const viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale & messages dibaca dari cookie via i18n/request.ts. Provider-nya
  // ada di root supaya semua client component (form wizard, language toggle,
  // dst.) bisa pakai `useTranslations`. Server component cukup pakai
  // `getTranslations`/`useTranslations` tanpa provider.
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
