import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
  "https://kotak-saran.vercel.app";

const TITLE = `Kotak Saran Elektronik — ${SITE_CONFIG.universityName}`;
const DESCRIPTION = `Sampaikan masukan, saran, kritik, dan keluhan Anda terhadap layanan akademik, non-akademik, dan sarana prasarana ${SITE_CONFIG.universityName}. Identitas dijamin kerahasiaannya.`;
const OG_TITLE = `Kotak Saran Elektronik ${SITE_CONFIG.universityShort}`;
const OG_DESCRIPTION = `Suarakan masukan Anda untuk peningkatan kualitas layanan ${SITE_CONFIG.universityName}.`;

export const metadata: Metadata = {
  metadataBase: new URL(
    SITE_URL.startsWith("http") ? SITE_URL : `https://${SITE_URL}`,
  ),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "kotak saran",
    "kotak saran universitas",
    SITE_CONFIG.universityName,
    SITE_CONFIG.universityShort,
    "keluhan",
    "saran mahasiswa",
  ],
  authors: [{ name: SITE_CONFIG.universityName }],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: "/apple-touch-icon.png",
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
