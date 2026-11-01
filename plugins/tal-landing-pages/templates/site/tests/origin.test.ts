import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "@/lib/origin";

describe("isAllowedOrigin", () => {
  it("בלי כותרת Origin: מותר", () => {
    expect(isAllowedOrigin({ origin: null, host: "example.co.il" })).toBe(true);
    expect(isAllowedOrigin({ origin: "", host: "example.co.il" })).toBe(true);
  });

  it("אותו host: מותר (כולל פורט, בלי תלות באותיות)", () => {
    expect(
      isAllowedOrigin({
        origin: "https://example.co.il",
        host: "example.co.il",
      }),
    ).toBe(true);
    expect(
      isAllowedOrigin({
        origin: "http://localhost:3000",
        host: "localhost:3000",
      }),
    ).toBe(true);
    expect(
      isAllowedOrigin({
        origin: "https://Example.CO.il",
        host: "example.co.il",
      }),
    ).toBe(true);
  });

  it("x-forwarded-host (הראשון ברשימה) נחשב", () => {
    expect(
      isAllowedOrigin({
        origin: "https://my-site.vercel.app",
        host: "internal:3000",
        forwardedHost: "my-site.vercel.app, proxy.local",
      }),
    ).toBe(true);
  });

  it("ה-host של site.page.url נחשב כשהוא מולא", () => {
    expect(
      isAllowedOrigin({
        origin: "https://www.example.co.il",
        host: "my-site.vercel.app",
        siteUrl: "https://www.example.co.il",
      }),
    ).toBe(true);
    // TODO או כתובת לא תקינה: מתעלמים
    expect(
      isAllowedOrigin({
        origin: "https://www.example.co.il",
        host: "a.vercel.app",
        siteUrl: "[למלא]",
      }),
    ).toBe(false);
  });

  it("host אחר: אסור", () => {
    expect(
      isAllowedOrigin({
        origin: "https://evil.example",
        host: "example.co.il",
      }),
    ).toBe(false);
    expect(
      isAllowedOrigin({
        origin: "https://example.co.il.evil.example",
        host: "example.co.il",
      }),
    ).toBe(false);
    expect(
      isAllowedOrigin({
        origin: "http://localhost:3001",
        host: "localhost:3000",
      }),
    ).toBe(false);
  });

  it("Origin לא תקין או 'null': אסור", () => {
    expect(isAllowedOrigin({ origin: "null", host: "example.co.il" })).toBe(
      false,
    );
    expect(
      isAllowedOrigin({ origin: "not a url", host: "example.co.il" }),
    ).toBe(false);
  });

  it("בלי host בכלל ועם Origin: אסור", () => {
    expect(
      isAllowedOrigin({ origin: "https://example.co.il", host: null }),
    ).toBe(false);
  });
});
