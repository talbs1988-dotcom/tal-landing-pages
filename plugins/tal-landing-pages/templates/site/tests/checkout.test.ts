import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { checkoutHref } from "@/lib/checkout";
import { TODO } from "@/lib/todo";

describe("checkoutHref: לאן כפתור בדף תשלום מוביל", () => {
  it("ריק, TODO או לא מחרוזת ← null (הכפתור גולל לטופס)", () => {
    expect(checkoutHref("")).toBeNull();
    expect(checkoutHref("   ")).toBeNull();
    expect(checkoutHref(TODO)).toBeNull();
    expect(checkoutHref(undefined)).toBeNull();
  });
  it("רק https מלא עובר. http, טקסט וכתובת בלי דומיין ← null", () => {
    expect(checkoutHref("http://pay.example.co.il/x")).toBeNull();
    expect(checkoutHref("javascript:alert(1)")).toBeNull();
    expect(checkoutHref("דף הסליקה")).toBeNull();
    expect(checkoutHref("https://localhost/x")).toBeNull();
    expect(checkoutHref(" https://pay.example.co.il/p/123 ")).toBe(
      "https://pay.example.co.il/p/123",
    );
  });
});

/** CtaAction עם config שבו page.checkoutUrl הוא הערך שמועבר */
async function renderCta(checkoutUrl: string) {
  vi.resetModules();
  vi.doMock("@/site.config", async () => {
    const real =
      await vi.importActual<typeof import("@/site.config")>("@/site.config");
    return {
      ...real,
      site: { ...real.site, page: { ...real.site.page, checkoutUrl } },
    };
  });
  const { CtaAction } = await import("@/components/CtaAction");
  const html = renderToString(
    createElement(CtaAction, { className: "btn", children: "לקנות את הסדנה" }),
  );
  vi.doUnmock("@/site.config");
  return html;
}

describe("CtaAction: הכפתור של הדף", () => {
  it("בלי דף תשלום: כפתור שגולל לטופס, לא קישור", async () => {
    const html = await renderCta("");
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).not.toMatch(/<a /);
  });
  it("עם דף תשלום: קישור רגיל לכתובת, עם rel=noopener", async () => {
    const html = await renderCta("https://pay.example.co.il/p/123");
    expect(html).toMatch(/^<a /);
    expect(html).toMatch(/href="https:\/\/pay\.example\.co\.il\/p\/123"/);
    expect(html).toMatch(/rel="noopener"/);
    expect(html).toMatch(/לקנות את הסדנה/);
  });
  it("כתובת לא תקינה: חוזר לכפתור של הטופס", async () => {
    const html = await renderCta("http://pay.example.co.il");
    expect(html).toMatch(/^<button/);
  });
});
