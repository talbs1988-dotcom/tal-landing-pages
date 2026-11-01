import { describe, expect, it } from "vitest";
import { g, pick } from "@/lib/copy";
import { TODO } from "@/lib/todo";

const send = g("שלח", "שלחי", "שלחו");

describe("pick", () => {
  it("בוחר לפי הקהל", () => {
    expect(pick(send, "male")).toBe("שלח");
    expect(pick(send, "female")).toBe("שלחי");
    expect(pick(send, "plural")).toBe("שלחו");
  });

  it("קהל שלא הוגדר (TODO) או לא מוכר: רבים", () => {
    expect(pick(send, TODO)).toBe("שלחו");
    expect(pick(send, "other")).toBe("שלחו");
    expect(pick(send, undefined)).toBe("שלחו");
  });
});
