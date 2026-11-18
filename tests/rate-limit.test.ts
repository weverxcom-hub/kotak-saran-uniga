import { beforeEach, describe, expect, it } from "vitest";
import { _resetRateLimits, checkRateLimit } from "@/lib/rate-limit";

const rule = { name: "t", limit: 3, windowMs: 1000 };

describe("checkRateLimit", () => {
  beforeEach(() => _resetRateLimits());

  it("menolak setelah batas lalu pulih setelah jendela lewat", () => {
    const t0 = 1_000_000;
    expect(checkRateLimit(rule, "ip", t0).ok).toBe(true);
    expect(checkRateLimit(rule, "ip", t0 + 1).ok).toBe(true);
    expect(checkRateLimit(rule, "ip", t0 + 2).ok).toBe(true);
    const blocked = checkRateLimit(rule, "ip", t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(checkRateLimit(rule, "ip-lain", t0 + 3).ok).toBe(true);
    expect(checkRateLimit(rule, "ip", t0 + 1001).ok).toBe(true);
  });
});
