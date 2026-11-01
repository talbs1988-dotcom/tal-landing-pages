import { describe, expect, it } from "vitest";
import {
  claimOnce,
  isValidPixelId,
  leadEventKey,
  memoryKeyStore,
  sessionKeyStore,
} from "@/lib/pixel";

describe("isValidPixelId", () => {
  it("ספרות בלבד, באורך סביר", () => {
    expect(isValidPixelId("123456789012345")).toBe(true);
    expect(isValidPixelId("1234567890123456")).toBe(true);
  });
  it.each([
    undefined,
    null,
    "",
    "abc",
    "12345",
    "1234567890123456789012",
    "12345678901234a",
    " 123456789012345",
    "123456789012345'; alert(1)//",
    123456789012345,
  ])("דוחה %s", (v) => {
    expect(isValidPixelId(v)).toBe(false);
  });
});

describe("claimOnce", () => {
  it("פעם ראשונה כן, אחר כך לא (גם ב-StrictMode, באותו זיכרון)", () => {
    const mem = memoryKeyStore();
    const key = leadEventKey("3f1c2b9e-6a7d-4e8f-9a0b-1c2d3e4f5a6b");
    expect(key).toBe("meta-lead:3f1c2b9e-6a7d-4e8f-9a0b-1c2d3e4f5a6b");
    expect(claimOnce(key, [mem])).toBe(true);
    expect(claimOnce(key, [mem])).toBe(false);
    expect(claimOnce("meta-lead:other", [mem])).toBe(true);
  });

  it("מזהה שכבר נשמר ב-sessionStorage (רענון) לא נשלח שוב", () => {
    const data = new Map<string, string>();
    const fake = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const first = [memoryKeyStore(), sessionKeyStore(() => fake)];
    expect(claimOnce("k", first)).toBe(true);
    // "רענון": זיכרון חדש, אותו sessionStorage
    const afterReload = [memoryKeyStore(), sessionKeyStore(() => fake)];
    expect(claimOnce("k", afterReload)).toBe(false);
  });

  it("sessionStorage שזורק (מצב פרטי) לא מפיל, והזיכרון עדיין מגן", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    const stores = [memoryKeyStore(), sessionKeyStore(() => throwing)];
    expect(claimOnce("k", stores)).toBe(true);
    expect(claimOnce("k", stores)).toBe(false);
    const noStorage = [memoryKeyStore(), sessionKeyStore(() => undefined)];
    expect(claimOnce("k", noStorage)).toBe(true);
  });
});
