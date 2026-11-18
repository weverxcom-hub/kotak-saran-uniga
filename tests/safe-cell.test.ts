import { describe, expect, it } from "vitest";
import { safeCell, safeRow } from "@/lib/safe-cell";

describe("safeCell", () => {
  it.each(["=1+1", "+62812", "-5", "@SUM(A1)", "\t=x", "=IMPORTXML(\"https://x\")"])(
    "menetralkan %s",
    (v) => {
      expect(safeCell(v)).toBe(`'${v}`);
    },
  );

  it.each(["Halo", "", "0812", "WB-20261119-ABCD2345", "Ya"])("membiarkan %s", (v) => {
    expect(safeCell(v)).toBe(v);
  });

  it("memproses satu baris", () => {
    expect(safeRow(["a", "=b"])).toEqual(["a", "'=b"]);
  });
});
