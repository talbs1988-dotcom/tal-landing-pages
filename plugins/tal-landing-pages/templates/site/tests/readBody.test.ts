import { describe, expect, it } from "vitest";
import { readBodyLimited } from "@/lib/readBody";

const req = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/lead", { method: "POST", body, headers });

describe("readBodyLimited", () => {
  it("קורא גוף קטן", async () => {
    expect(await readBodyLimited(req('{"a":1}'), 100)).toEqual({
      ok: true,
      text: '{"a":1}',
    });
  });

  it("גוף ריק", async () => {
    expect(await readBodyLimited(req(null), 100)).toEqual({
      ok: true,
      text: "",
    });
  });

  it("עברית נמדדת בבתים, לא בתווים", async () => {
    // 6 אותיות עבריות = 12 בתים
    expect((await readBodyLimited(req("אבגדהו"), 11)).ok).toBe(false);
    expect((await readBodyLimited(req("אבגדהו"), 12)).ok).toBe(true);
  });

  it("גוף גדול מהמותר נדחה", async () => {
    expect(await readBodyLimited(req("x".repeat(10_241)), 10_240)).toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("content-length גדול נדחה בלי לקרוא", async () => {
    const r = req("x", { "content-length": "999999" });
    expect(await readBodyLimited(r, 10_240)).toEqual({
      ok: false,
      reason: "too_large",
    });
  });
});
