import { NextResponse } from "next/server";
import {
  ENTRY_IDS,
  FORM_RESPONSE_URL,
  ROLE_OPTIONS,
  UNIT_OPTIONS,
  type SuggestionPayload,
} from "@/lib/form-config";

export const runtime = "edge";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function validate(input: unknown): SuggestionPayload | { error: string } {
  if (!input || typeof input !== "object") return { error: "Body tidak valid." };
  const body = input as Record<string, unknown>;

  const saudaraAdalah = isString(body.saudaraAdalah)
    ? body.saudaraAdalah.trim()
    : "";
  if (!saudaraAdalah) return { error: "Field 'Saudara adalah' wajib diisi." };

  const unitKerja = isString(body.unitKerja) ? body.unitKerja.trim() : "";
  if (!UNIT_OPTIONS.includes(unitKerja as (typeof UNIT_OPTIONS)[number])) {
    return { error: "Unit kerja tidak valid." };
  }

  const isAnonim = body.isAnonim === "Ya" ? "Ya" : body.isAnonim === "Tidak" ? "Tidak" : null;
  if (!isAnonim) return { error: "Pilihan anonim wajib diisi." };

  const masukan = isString(body.masukan) ? body.masukan.trim() : "";
  if (masukan.length < 10) {
    return { error: "Masukan/saran minimal 10 karakter." };
  }
  if (masukan.length > 5000) {
    return { error: "Masukan/saran maksimal 5000 karakter." };
  }

  const nama = isString(body.nama) ? body.nama.trim() : "";
  const nim = isString(body.nim) ? body.nim.trim() : "";
  const kronologi = isString(body.kronologi) ? body.kronologi.trim() : "";
  const kontak = isString(body.kontak) ? body.kontak.trim() : "";

  if (isAnonim === "Tidak" && !nama) {
    return { error: "Nama wajib diisi jika tidak anonim." };
  }

  // Sanity checks
  if (nama.length > 200) return { error: "Nama terlalu panjang." };
  if (nim.length > 60) return { error: "NIM/NIDN/NIS terlalu panjang." };
  if (kronologi.length > 5000)
    return { error: "Kronologi terlalu panjang (maks 5000 karakter)." };
  if (kontak.length > 60) return { error: "Nomor kontak terlalu panjang." };

  return {
    saudaraAdalah,
    unitKerja: unitKerja as (typeof UNIT_OPTIONS)[number],
    isAnonim,
    nama,
    nim,
    masukan,
    kronologi,
    kontak,
  };
}

function buildFormBody(payload: SuggestionPayload): URLSearchParams {
  const body = new URLSearchParams();

  // Saudara adalah - support "Other" via __other_option__
  const knownRole = (ROLE_OPTIONS as readonly string[]).includes(
    payload.saudaraAdalah,
  );
  if (knownRole) {
    body.append(ENTRY_IDS.saudaraAdalah, payload.saudaraAdalah);
  } else if (payload.saudaraAdalah) {
    body.append(ENTRY_IDS.saudaraAdalah, "__other_option__");
    body.append(`${ENTRY_IDS.saudaraAdalah}.other_option_response`, payload.saudaraAdalah);
  }

  body.append(ENTRY_IDS.unitKerja, payload.unitKerja);
  body.append(ENTRY_IDS.isAnonim, payload.isAnonim);

  if (payload.isAnonim === "Tidak") {
    if (payload.nama) body.append(ENTRY_IDS.identitas.nama, payload.nama);
    if (payload.nim) body.append(ENTRY_IDS.identitas.nim, payload.nim);
    body.append(ENTRY_IDS.identitas.masukan, payload.masukan);
    if (payload.kronologi)
      body.append(ENTRY_IDS.identitas.kronologi, payload.kronologi);
    if (payload.kontak) body.append(ENTRY_IDS.identitas.kontak, payload.kontak);
  } else {
    body.append(ENTRY_IDS.anonim.masukan, payload.masukan);
    if (payload.kronologi)
      body.append(ENTRY_IDS.anonim.kronologi, payload.kronologi);
    if (payload.kontak) body.append(ENTRY_IDS.anonim.kontak, payload.kontak);
  }

  body.append("fvv", "1");
  body.append("pageHistory", payload.isAnonim === "Tidak" ? "0,1" : "0,2");
  body.append("submissionTimestamp", String(Date.now()));

  return body;
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }

  const validated = validate(json);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const body = buildFormBody(validated);

  try {
    const res = await fetch(FORM_RESPONSE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: body.toString(),
      redirect: "manual",
    });

    // Google Forms returns 200 with formResponse page on success,
    // or 302 redirect; both are acceptable.
    if (res.status >= 200 && res.status < 400) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: `Gagal mengirim ke Google Form (status ${res.status}).` },
      { status: 502 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Gagal menghubungi Google Form: ${err.message}`
            : "Gagal menghubungi Google Form.",
      },
      { status: 502 },
    );
  }
}
