import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EmailLink } from "@/components/LegalPage";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("מייל ארוך בדפים המשפטיים לא יוצא מהמסך", () => {
  it("קישור המייל נשבר בכל מקום ([overflow-wrap:anywhere])", () => {
    const html = renderToStaticMarkup(
      createElement(EmailLink, { email: "accessibility@studio-yael-cohen.co.il" }),
    );
    expect(html).toContain("[overflow-wrap:anywhere]");
  });

  it("לכל dd בטבלאות פרטי העסק ורכז הנגישות יש min-w-0", () => {
    for (const f of ["components/LegalPage.tsx", "app/accessibility/page.tsx"]) {
      const src = readFileSync(`${ROOT}/${f}`, "utf8");
      const dds = src.match(/<dd\b[^>]*>/g) ?? [];
      expect(dds.length).toBeGreaterThan(0);
      for (const dd of dds) expect(dd).toMatch(/min-w-0/);
    }
  });
});
