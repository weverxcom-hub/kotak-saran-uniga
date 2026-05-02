import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_URL ||
  "https://kotak-saran.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(
    SITE_URL.startsWith("http") ? SITE_URL : `https://${SITE_URL}`,
  ),
  title:
    "Kotak Saran Elektronik — Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang",
  description:
    "Sampaikan masukan, saran, kritik, dan keluhan Anda terhadap layanan akademik, non-akademik, dan sarana prasarana FEB Universitas Gajayana Malang. Identitas dijamin kerahasiaannya.",
  keywords: [
    "kotak saran",
    "FEB",
    "Universitas Gajayana",
    "UNIGA Malang",
    "keluhan",
    "saran mahasiswa",
  ],
  authors: [{ name: "Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang" }],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Kotak Saran Elektronik FEB UNIGA Malang",
    description:
      "Suarakan masukan Anda untuk peningkatan kualitas layanan FEB Universitas Gajayana Malang.",
    type: "website",
    locale: "id_ID",
    images: [{ url: "/img/uniga-logo@2x.png", width: 440, height: 440 }],
  },
  twitter: {
    card: "summary",
    title: "Kotak Saran Elektronik FEB UNIGA Malang",
    description:
      "Suarakan masukan Anda untuk peningkatan kualitas layanan FEB Universitas Gajayana Malang.",
    images: ["/img/uniga-logo@2x.png"],
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
