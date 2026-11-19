import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

type Tree = { [k: string]: string | Tree };
const load = (l: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "messages", `${l}.json`), "utf8")) as Tree;

function flat(t: Tree, p = ""): Record<string, string> {
  return Object.entries(t).reduce<Record<string, string>>((acc, [k, v]) => {
    if (typeof v === "string") acc[p + k] = v;
    else Object.assign(acc, flat(v, `${p}${k}.`));
    return acc;
  }, {});
}

const id = flat(load("id"));
const en = flat(load("en"));
const tags = (s: string) => Array.from(s.matchAll(/<(\w+)>/g)).map((m) => m[1]).sort();
const args = (s: string) => Array.from(s.matchAll(/\{(\w+)\}/g)).map((m) => m[1]).sort();

describe("pesan terjemahan", () => {
  it("kunci id dan en sama persis", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
  });

  it("tag rich-text dan placeholder sama di kedua bahasa", () => {
    for (const k of Object.keys(id)) {
      expect({ k, tags: tags(en[k] ?? "") }).toEqual({ k, tags: tags(id[k]!) });
      expect({ k, args: args(en[k] ?? "") }).toEqual({ k, args: args(id[k]!) });
    }
  });

  // Regresi bug 500 /whistleblower: kode memanggil t.rich("x", { tag: fn })
  // tetapi pesannya memakai {tag} (placeholder), bukan <tag>…</tag>.
  it("setiap fungsi di t.rich punya tag yang cocok di pesannya", () => {
    const src = path.join(__dirname, "..", "src");
    const files = fs
      .readdirSync(src, { recursive: true })
      .map(String)
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => fs.readFileSync(path.join(src, f), "utf8"));
    const problems: string[] = [];
    for (const code of files) {
      const ns = Array.from(code.matchAll(/useTranslations\(\s*"([\w.]+)"\s*\)|getTranslations\(\s*"([\w.]+)"\s*\)/g)).map(
        (m) => m[1] ?? m[2],
      );
      for (const m of Array.from(code.matchAll(/t\.rich\(\s*"([\w.]+)"\s*,\s*\{([\s\S]*?)\}\s*\)/g))) {
        const key = m[1]!;
        const fnNames = Array.from(m[2]!.matchAll(/(\w+)\s*:\s*\(\s*chunks/g)).map((x) => x[1]!);
        const msg = ns.map((n) => id[`${n}.${key}`]).find(Boolean) ?? id[key];
        if (!msg) continue;
        for (const fn of fnNames) {
          if (!msg.includes(`<${fn}>`)) problems.push(`${key}: <${fn}> tidak ada`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
