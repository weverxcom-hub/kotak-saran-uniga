import createNextIntlPlugin from "next-intl/plugin";

// Tunjuk ke konfigurasi i18n di src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
