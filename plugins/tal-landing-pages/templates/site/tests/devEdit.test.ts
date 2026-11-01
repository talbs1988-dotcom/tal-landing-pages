import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEV_EDIT_MSG,
  devEditDisabled,
  MAX_EDIT_LENGTH,
  applyEdit,
  checkDevEditRequest,
  handleDevEdit,
  isLoopbackHost,
} from "@/lib/devEdit";
import { writeFileAtomic } from "@/lib/atomicWrite";
import * as route from "@/app/api/dev-edit/route";
import { TODO } from "@/lib/todo";

const FILE = `{
  "hero.title": "כותרת ישנה",
  "hero.subtitle": "[למלא]",
  "form.title": "השארת פרטים"
}
`;

describe("applyEdit", () => {
  it("מחליף את הערך, שומר על סדר המפתחות ועל 2 רווחים", () => {
    const r = applyEdit(FILE, { key: "hero.subtitle", value: "תת כותרת" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toBe("תת כותרת");
    expect(r.content).toBe(`{
  "hero.title": "כותרת ישנה",
  "hero.subtitle": "תת כותרת",
  "form.title": "השארת פרטים"
}
`);
  });

  it("מנקה תווים בלתי נראים, תווי שליטה ורווחים כפולים", () => {
    const r = applyEdit(FILE, {
      key: "hero.title",
      value: "  שלום​‮ עולם\u0007\n\nחדש  ",
    });
    expect(r.ok && r.value).toBe("שלום עולם חדש");
  });

  it("ערך ריק (או רק רווחים) נשמר כ-[למלא], כדי ש-check:todo יספור אותו", () => {
    const r = applyEdit(FILE, { key: "hero.title", value: " ​ " });
    expect(r.ok && r.value).toBe(TODO);
    expect(r.ok && JSON.parse(r.content)["hero.title"]).toBe(TODO);
  });

  it("טקסט בלבד: HTML נשמר כטקסט, לא כתגית שתתפרש", () => {
    const r = applyEdit(FILE, { key: "hero.title", value: "<b>x</b>" });
    expect(r.ok && JSON.parse(r.content)["hero.title"]).toBe("<b>x</b>");
  });

  it("מפתח שלא קיים בקובץ: 422", () => {
    const r = applyEdit(FILE, { key: "hero.nope", value: "x" });
    expect(r).toEqual({
      ok: false,
      status: 422,
      error: DEV_EDIT_MSG.unknownKey,
    });
  });

  it("מפתחות של Object.prototype לא נחשבים קיימים", () => {
    for (const key of ["__proto__", "constructor", "toString"]) {
      const r = applyEdit(FILE, { key, value: "x" });
      expect(r.ok, key).toBe(false);
    }
  });

  it(`ערך עד ${MAX_EDIT_LENGTH} תווים עובר, מעל זה 422`, () => {
    expect(
      applyEdit(FILE, { key: "hero.title", value: "א".repeat(MAX_EDIT_LENGTH) })
        .ok,
    ).toBe(true);
    const r = applyEdit(FILE, {
      key: "hero.title",
      value: "א".repeat(MAX_EDIT_LENGTH + 1),
    });
    expect(r).toEqual({ ok: false, status: 422, error: DEV_EDIT_MSG.tooLong });
  });

  it("גוף לא תקין: 400", () => {
    for (const body of [
      null,
      "x",
      [],
      {},
      { key: "hero.title" },
      { key: 1, value: "x" },
      { key: "hero.title", value: 5 },
    ]) {
      const r = applyEdit(FILE, body);
      expect(r.ok, JSON.stringify(body)).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
  });

  it("copy.json פגום או עם ערך שאינו מחרוזת: 500, ולא דורסים", () => {
    expect(applyEdit("{ bad json", { key: "a.b", value: "x" })).toMatchObject({
      ok: false,
      status: 500,
    });
    expect(applyEdit('{"a.b": 3}', { key: "a.b", value: "x" })).toMatchObject({
      ok: false,
      status: 500,
    });
    expect(applyEdit("[]", { key: "a.b", value: "x" })).toMatchObject({
      ok: false,
      status: 500,
    });
  });
});

describe("isLoopbackHost", () => {
  it("רק המחשב המקומי", () => {
    for (const h of [
      "localhost:3000",
      "127.0.0.1:4123",
      "[::1]:3000",
      "localhost",
      "site.localhost:3000",
    ])
      expect(isLoopbackHost(h), h).toBe(true);
    for (const h of [
      "example.com",
      "192.168.1.5:3000",
      "localhost.evil.com",
      "",
      null,
      undefined,
    ])
      expect(isLoopbackHost(h), String(h)).toBe(false);
  });
});

describe("checkDevEditRequest", () => {
  const good = {
    origin: "http://localhost:3000",
    host: "localhost:3000",
    secFetchSite: "same-origin",
    contentType: "application/json",
  };

  it("בקשה מאותו מקור עוברת", () => {
    expect(checkDevEditRequest(good)).toEqual({ ok: true });
    expect(checkDevEditRequest({ ...good, secFetchSite: null })).toEqual({
      ok: true,
    });
  });

  it("בלי Origin, ממקור אחר, או מ-host שאינו מקומי: 403", () => {
    for (const over of [
      { origin: null },
      { origin: "http://evil.com" },
      { origin: "http://localhost:4000" },
      { origin: "not a url" },
      { secFetchSite: "cross-site" },
      { origin: "http://evil.com:3000", host: "evil.com:3000" },
    ]) {
      expect(
        checkDevEditRequest({ ...good, ...over }),
        JSON.stringify(over),
      ).toMatchObject({ ok: false, status: 403 });
    }
  });

  it("בלי application/json: 415", () => {
    expect(
      checkDevEditRequest({ ...good, contentType: "text/plain" }),
    ).toMatchObject({ ok: false, status: 415 });
  });
});

function req(
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return new Request("http://localhost:3000/api/dev-edit", {
    method,
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body:
      method === "POST"
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
        : undefined,
  });
}

function deps(nodeEnv: string | undefined, initial = FILE) {
  const state = { content: initial, writes: 0 };
  return {
    state,
    deps: {
      nodeEnv,
      readCopy: async () => state.content,
      writeCopy: async (c: string) => {
        state.writes++;
        state.content = c;
      },
    },
  };
}

describe("handleDevEdit", () => {
  it("בכל סביבה שאינה development: 404 ולא נוגעים בקובץ", async () => {
    for (const env of ["production", "test", undefined, "Development"]) {
      const d = deps(env);
      const res = await handleDevEdit(
        req({ key: "hero.title", value: "x" }),
        d.deps,
      );
      expect(res.status, String(env)).toBe(404);
      expect(d.state.writes).toBe(0);
    }
  });

  it("ב-development: שומר ומחזיר את הערך הנקי", async () => {
    const d = deps("development");
    const res = await handleDevEdit(
      req({ key: "hero.title", value: " כותרת  חדשה " }),
      d.deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      key: "hero.title",
      value: "כותרת חדשה",
    });
    expect(JSON.parse(d.state.content)["hero.title"]).toBe("כותרת חדשה");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("מקור אחר: 403 ולא נשמר", async () => {
    const d = deps("development");
    const res = await handleDevEdit(
      req({ key: "hero.title", value: "x" }, { origin: "http://evil.com" }),
      d.deps,
    );
    expect(res.status).toBe(403);
    expect(d.state.writes).toBe(0);
  });

  it("גוף גדול מדי: 413", async () => {
    const d = deps("development");
    const res = await handleDevEdit(
      req({ key: "hero.title", value: "x".repeat(20_000) }),
      d.deps,
    );
    expect(res.status).toBe(413);
  });

  it("JSON שבור: 400", async () => {
    const d = deps("development");
    const res = await handleDevEdit(req("{oops"), d.deps);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(DEV_EDIT_MSG.badRequest);
  });

  it("מפתח לא קיים: 422 עם הודעה בעברית", async () => {
    const d = deps("development");
    const res = await handleDevEdit(
      req({ key: "hero.nope", value: "x" }),
      d.deps,
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(DEV_EDIT_MSG.unknownKey);
    expect(d.state.writes).toBe(0);
  });

  it("כישלון בכתיבה: 500 עם הודעה בעברית", async () => {
    const d = deps("development");
    d.deps.writeCopy = async () => {
      throw new Error("disk full");
    };
    const res = await handleDevEdit(
      req({ key: "hero.title", value: "x" }),
      d.deps,
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(DEV_EDIT_MSG.writeFailed);
  });
});

describe("app/api/dev-edit/route", () => {
  // vitest רץ עם NODE_ENV=test, כלומר "לא development", כמו בפרודקשן
  it("הנתיב האמיתי מחזיר 404 מחוץ ל-development, בכל שיטה", async () => {
    expect(process.env.NODE_ENV).not.toBe("development");
    expect(
      (await route.POST(req({ key: "hero.title", value: "x" }))).status,
    ).toBe(404);
    for (const m of ["GET", "PUT", "PATCH", "DELETE", "OPTIONS"] as const) {
      const res = await route[m]();
      expect(res.status, m).toBe(404);
    }
  });
});

describe("writeFileAtomic", () => {
  const dirs: string[] = [];
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  it("כותב את התוכן ולא משאיר קובץ זמני", async () => {
    const dir = mkdtempSync(join(tmpdir(), "atomic-"));
    dirs.push(dir);
    const file = join(dir, "copy.json");
    writeFileSync(file, "old");
    await writeFileAtomic(file, '{\n  "a.b": "חדש"\n}\n');
    expect(readFileSync(file, "utf8")).toBe('{\n  "a.b": "חדש"\n}\n');
    expect(readdirSync(dir)).toEqual(["copy.json"]);
  });

  it("כשהכתיבה נכשלת, הקובץ המקורי נשאר כמו שהוא", async () => {
    const dir = mkdtempSync(join(tmpdir(), "atomic-"));
    dirs.push(dir);
    const file = join(dir, "missing-dir", "copy.json");
    await expect(writeFileAtomic(file, "x")).rejects.toThrow();
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe("devEditDisabled (npm run dev:phone)", () => {
  it("DEV_EDIT=off מכבה את מצב העריכה, כל ערך אחר לא", () => {
    expect(devEditDisabled("off")).toBe(true);
    expect(devEditDisabled(" OFF ")).toBe(true);
    expect(devEditDisabled(undefined)).toBe(false);
    expect(devEditDisabled("")).toBe(false);
    expect(devEditDisabled("on")).toBe(false);
  });
});

describe("package.json: שרת הפיתוח", () => {
  it("npm run dev מאזין רק למחשב עצמו, ו-dev:phone מכבה את מצב העריכה", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(pkg.scripts.dev).toMatch(/-H 127\.0\.0\.1/);
    const phone = readFileSync(
      new URL("../scripts/dev-phone.mjs", import.meta.url),
      "utf8",
    );
    expect(phone).toMatch(/DEV_EDIT:\s*"off"/);
  });
});
