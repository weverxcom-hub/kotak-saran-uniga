import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Regresi: tailwind-merge pernah membuang `bg-card` dari <Select> karena
// kelas bg-[...] untuk ikon panah, sehingga di mode gelap latar select
// jatuh ke warna putih bawaan browser dan teksnya tidak terbaca.
describe("kontrol form punya warna latar sendiri (bg-card)", () => {
  const cases: Array<[string, React.ReactElement]> = [
    ["Input", <Input key="i" />],
    ["Textarea", <Textarea key="t" />],
    ["Select", <Select key="s"><option>a</option></Select>],
    ["Select dengan className tambahan", <Select key="s2" className="h-9 bg-card"><option>a</option></Select>],
  ];
  for (const [name, el] of cases) {
    it(name, () => {
      const cls = renderToStaticMarkup(el).match(/class="([^"]*)"/)?.[1] ?? "";
      expect(cls.split(" ")).toContain("bg-card");
    });
  }
});
