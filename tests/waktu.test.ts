import { describe, expect, it } from "vitest";
import { formatWibTimestamp, generateCaseId } from "@/lib/waktu";

describe("waktu WIB", () => {
  it("23.30 UTC tercatat sebagai 06.30 hari berikutnya", () => {
    const d = new Date("2026-11-18T23:30:05Z");
    expect(formatWibTimestamp(d)).toBe("19/11/2026 06:30:05");
  });

  it("tanggal Case ID mengikuti WIB", () => {
    const d = new Date("2026-11-18T23:30:05Z");
    expect(generateCaseId(d)).toMatch(/^WB-20261119-[2-9A-HJKMNP-Z]{8}$/);
  });

  it("Case ID tidak berulang", () => {
    const d = new Date();
    const ids = new Set(Array.from({ length: 2000 }, () => generateCaseId(d)));
    expect(ids.size).toBe(2000);
  });
});
