import { getRequestConfig } from "next-intl/server";

import { getLocaleFromCookies } from "./locale";

/**
 * Konfigurasi request next-intl. Locale ditentukan dari cookie (lihat
 * `getLocaleFromCookies`) — bukan dari segment URL — supaya rute publik tetap
 * sama untuk ID maupun EN.
 *
 * Pesan di-load lazy per request via dynamic import. Webpack akan code-split
 * tiap file `messages/<locale>.json` jadi cuma pesan untuk locale aktif yang
 * dikirim ke client.
 */
export default getRequestConfig(async () => {
  const locale = getLocaleFromCookies();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
