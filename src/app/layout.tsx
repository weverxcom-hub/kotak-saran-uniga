import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Kotak Saran Elektronik — Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang",
  description:
    "Sampaikan masukan, saran, kritik, dan keluhan Anda terhadap layanan akademik, non-akademik, dan sarana prasarana FEB Universitas Gajayana Malang. Identitas dijamin kerahasiaannya.",
  keywords: [
    "kotak saran",
    "FEB",
    "Universitas Gajayana",
    "Malang",
    "keluhan",
    "saran mahasiswa",
  ],
  authors: [{ name: "Fakultas Ekonomi dan Bisnis Universitas Gajayana Malang" }],
  openGraph: {
    title: "Kotak Saran Elektronik FEB UNIGA Malang",
    description:
      "Suarakan masukan Anda untuk peningkatan kualitas layanan FEB Universitas Gajayana Malang.",
    type: "website",
    locale: "id_ID",
  },
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
