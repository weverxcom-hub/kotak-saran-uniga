import { NextResponse } from "next/server";
import { fetchActiveUnits } from "@/lib/units";
import { SheetsConfigError } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint publik untuk daftar Fakultas → Prodi yang aktif. Form di
 * halaman utama dan halaman whistleblower fetch endpoint ini saat load.
 *
 * Output dikelompokkan per fakultas supaya client tinggal render
 * cascade dropdown:
 *   {
 *     groups: [
 *       { fakultas: "...", prodi: ["...", "..."] },
 *       ...
 *     ],
 *     // Flat units list (id + label) bila perlu untuk dashboard.
 *     units: [{ id, fakultas, prodi, label }, ...]
 *   }
 */
export async function GET() {
  try {
    const units = await fetchActiveUnits();
    const groupMap = new Map<
      string,
      { prodi: string[]; hasFacultyLevel: boolean }
    >();
    for (const u of units) {
      if (!groupMap.has(u.fakultas))
        groupMap.set(u.fakultas, { prodi: [], hasFacultyLevel: false });
      const g = groupMap.get(u.fakultas)!;
      if (u.prodi) g.prodi.push(u.prodi);
      else g.hasFacultyLevel = true;
    }
    const groups = Array.from(groupMap.entries()).map(
      ([fakultas, { prodi, hasFacultyLevel }]) => ({
        fakultas,
        // Tandai apakah fakultas ini juga punya entri level fakultas
        // saja (mis. "FAKULTAS EKONOMI DAN BISNIS" tanpa prodi). Form
        // pakai ini untuk menampilkan opsi "(tingkat fakultas saja)".
        hasFacultyLevel,
        // De-dup & stable order (sudah di-sort by urutan di server).
        prodi: Array.from(new Set(prodi)),
      }),
    );
    const flat = units.map((u) => ({
      id: u.id,
      fakultas: u.fakultas,
      prodi: u.prodi,
      label: u.prodi ? `${u.fakultas} — ${u.prodi}` : u.fakultas,
    }));
    return NextResponse.json(
      { groups, units: flat },
      {
        headers: {
          // Cache di edge sebentar supaya request berturut-turut hemat
          // panggilan ke Google Sheets.
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    // Detail teknis hanya di log server.
    const kind = err instanceof SheetsConfigError ? "config" : "upstream";
    console.error(`[units] ${kind}: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json(
      {
        error: "Daftar fakultas belum bisa dimuat. Muat ulang halaman atau coba lagi beberapa saat lagi.",
        groups: [],
        units: [],
      },
      { status: kind === "config" ? 500 : 502 },
    );
  }
}
