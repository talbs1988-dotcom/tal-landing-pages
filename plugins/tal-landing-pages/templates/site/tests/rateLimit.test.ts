import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, set: (v: number) => (t = v) };
}

describe("createRateLimiter", () => {
  it("10 בקשות בדקה, ה-11 נחסמת", () => {
    const c = clock();
    const rl = createRateLimiter({ limit: 10, windowMs: 60_000, now: c.now });
    for (let i = 0; i < 10; i++) expect(rl.check("1.1.1.1")).toBe(true);
    expect(rl.check("1.1.1.1")).toBe(false);
    expect(rl.check("2.2.2.2")).toBe(true);
  });

  it("חלון נע: בקשות ישנות יוצאות מהספירה", () => {
    const c = clock();
    const rl = createRateLimiter({ limit: 10, windowMs: 60_000, now: c.now });
    for (let i = 0; i < 5; i++) rl.check("ip");
    c.set(30_000);
    for (let i = 0; i < 5; i++) expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(false);
    c.set(60_001); // 5 הראשונות יצאו מהחלון
    for (let i = 0; i < 5; i++) expect(rl.check("ip")).toBe(true);
    expect(rl.check("ip")).toBe(false);
  });

  it("בקשה שנחסמה לא נספרת", () => {
    const c = clock();
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: c.now });
    rl.check("ip");
    rl.check("ip");
    for (let i = 0; i < 50; i++) rl.check("ip");
    c.set(1001);
    expect(rl.check("ip")).toBe(true);
  });

  it("מנקה מפתחות שפג תוקפם כדי שהזיכרון לא יגדל", () => {
    const c = clock();
    const rl = createRateLimiter({ limit: 10, windowMs: 60_000, now: c.now });
    for (let i = 0; i < 1000; i++)
      rl.check(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    expect(rl.size()).toBe(1000);
    c.set(60_001);
    rl.check("new");
    expect(rl.size()).toBe(1);
  });

  it("תקרת מפתחות: לא גדל בלי סוף גם בתוך החלון", () => {
    const c = clock();
    const rl = createRateLimiter({
      limit: 10,
      windowMs: 60_000,
      now: c.now,
      maxKeys: 100,
    });
    for (let i = 0; i < 500; i++) rl.check(`k${i}`);
    expect(rl.size()).toBeLessThanOrEqual(100);
  });
});
