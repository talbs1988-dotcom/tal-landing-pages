import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error קובץ mjs בלי טיפוסים
import { blockedPath, findSecrets } from "../scripts/secret-guard.mjs";

const SITE = fileURLToPath(new URL("..", import.meta.url));

// ערכים מזויפים, מורכבים בזמן הריצה כדי שהקובץ הזה עצמו לא ייראה כמו סוד
const FAKE = {
  make: "https://" + "hook.eu2.make.com/" + "abcdefghij1234567890",
  meta: "EAA" + "B".repeat(40),
  github: "ghp_" + "a1".repeat(18),
  blob: "vercel_blob_rw_" + "x9".repeat(10),
  slack: "https://" + "hooks.slack.com/services/" + "T000/B000/" + "abcdefghijklmnop",
  zapier: "https://" + "hooks.zapier.com/hooks/catch/" + "123456/abcdef",
  integromat: "https://" + "hook.eu1.integromat.com/" + "abcdefghij1234567890",
  jwt: "eyJ" + "a".repeat(20) + ".eyJ" + "b".repeat(20) + "." + "c".repeat(20),
};

type F = { path: string; text: string | null };
const one = (path: string, text: string | null = "") =>
  findSecrets([{ path, text }] as F[]);

describe("blockedPath", () => {
  it("חוסם קבצי סביבה, חוץ מ-.env.example", () => {
    expect(blockedPath(".env")).toBeTruthy();
    expect(blockedPath(".env.local")).toBeTruthy();
    expect(blockedPath("app/.env.production")).toBeTruthy();
    expect(blockedPath(".env.example")).toBeNull();
  });
  it("חוסם את .vercel, מפתחות וגיבוי לידים", () => {
    expect(blockedPath(".vercel/project.json")).toBeTruthy();
    expect(blockedPath("certs/server.pem")).toBeTruthy();
    expect(blockedPath("id_rsa")).toBeTruthy();
    expect(blockedPath("leads/2026-11-01/abc.json")).toBeTruthy();
    expect(blockedPath("leads-download/abc.json")).toBeTruthy();
    expect(blockedPath("leads.csv")).toBeTruthy();
    expect(blockedPath("data/leads-backup.json")).toBeTruthy();
    expect(blockedPath(".envrc")).toBeTruthy();
    expect(blockedPath("env.local")).toBeTruthy();
  });
  it("לא חוסם קבצים רגילים של האתר", () => {
    for (const p of [
      "app/page.tsx",
      "app/api/lead/route.ts",
      "lib/handleLead.ts",
      "README.md",
    ])
      expect(blockedPath(p)).toBeNull();
  });
});

describe("findSecrets", () => {
  it("מוצא קודים סודיים בתוכן, עם קובץ ושורה", () => {
    const r = one("lib/x.ts", `const a = 1;\nconst url = "${FAKE.make}";\n`);
    expect(r).toEqual([
      { path: "lib/x.ts", line: 2, what: "כתובת וובהוק של Make" },
    ]);
    expect(one("a.ts", FAKE.meta)[0].what).toBe("טוקן של מטא");
    expect(one("a.ts", FAKE.github)[0].what).toBe("טוקן של GitHub");
    expect(one("a.ts", FAKE.blob)[0].what).toBe("טוקן של אחסון Vercel");
    expect(one("a.ts", FAKE.slack)[0].what).toBe("כתובת וובהוק של Slack");
    expect(one("a.ts", FAKE.zapier)[0].what).toBe("כתובת וובהוק של Zapier");
    expect(one("a.ts", FAKE.integromat)[0].what).toBe("כתובת וובהוק של Make");
    expect(one("a.ts", FAKE.jwt)[0].what).toBe("טוקן גישה (JWT)");
    expect(one("a.ts", "-----BEGIN RSA " + "PRIVATE KEY-----")[0].what).toBe(
      "מפתח פרטי",
    );
  });
  it("מוצא ערך אמיתי למשתנה סודי", () => {
    expect(one("notes.md", "META_CAPI_TOKEN" + "=abcdefghijklmnop123")[0].what).toBe(
      "ערך אמיתי ל-META_CAPI_TOKEN",
    );
    expect(
      one(
        "x.json",
        '"ALERT_WEBHOOK_URL"' + ': "https://hooks.realhost.io/zz11223344"',
      ),
    ).toHaveLength(1);
  });
  it("לא נבהל משם של משתנה בלי ערך, או מערך לדוגמה", () => {
    for (const text of [
      "WEBHOOK_URL=",
      "WEBHOOK_URL=<הכתובת מ-Make>",
      "META_CAPI_TOKEN=...",
      "process.env.WEBHOOK_URL",
      "env.WEBHOOK_URL ?? ''",
      "`WEBHOOK_URL` נכנס רק ב-Vercel",
      'WEBHOOK_URL: "your-webhook-here"',
      "WEBHOOK_URL=http://127.0.0.1:4545/lead npm start",
    ])
      expect(one("TEMPLATE.md", text), text).toEqual([]);
  });
  it("קובץ בינארי נבדק רק לפי השם", () => {
    expect(one("public/a.png", null)).toEqual([]);
    expect(one(".env", null)).toHaveLength(1);
  });
  it("קובץ חסום מדווח פעם אחת, בלי לסרוק את התוכן", () => {
    expect(one(".env", `${FAKE.make}\n${FAKE.meta}`)).toEqual([
      { path: ".env", what: "קובץ סביבה, יכולים להיות בו סודות" },
    ]);
  });
});

describe("התבנית עצמה נקייה", () => {
  it("אין בקבצי התבנית שום דבר שהשומר חוסם", () => {
    const files: F[] = [];
    const skip = new Set(["node_modules", ".next", ".vercel"]);
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (skip.has(name)) continue;
        const p = join(dir, name);
        const rel = relative(SITE, p).split(sep).join("/");
        if (statSync(p).isDirectory()) walk(p);
        else if (!rel.endsWith(".tsbuildinfo") && rel !== "next-env.d.ts") {
          const buf = readFileSync(p);
          files.push({
            path: rel,
            text: buf.includes(0) ? null : buf.toString("utf8"),
          });
        }
      }
    };
    walk(SITE);
    expect(findSecrets(files)).toEqual([]);
  });
});

describe("החיבור ל-git (שמירה אמיתית)", () => {
  const dirs: string[] = [];
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  function repo(): string {
    const root = mkdtempSync(join(tmpdir(), "guard-"));
    dirs.push(root);
    mkdirSync(join(root, "scripts"));
    cpSync(
      join(SITE, "scripts", "secret-guard.mjs"),
      join(root, "scripts", "secret-guard.mjs"),
    );
    cpSync(join(SITE, ".githooks"), join(root, ".githooks"), {
      recursive: true,
    });
    const g = (...a: string[]) =>
      execFileSync("git", a, { cwd: root, stdio: "pipe" });
    g("init", "-q", "-b", "main");
    g("config", "user.email", "test@example.com");
    g("config", "user.name", "test");
    g("config", "commit.gpgsign", "false");
    execFileSync("node", ["scripts/secret-guard.mjs", "install"], {
      cwd: root,
      stdio: "pipe",
    });
    return root;
  }
  const write = (root: string, rel: string, text: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  const commit = (root: string, ...files: string[]) => {
    execFileSync("git", ["add", "-f", ...files], { cwd: root, stdio: "pipe" });
    return spawnSync("git", ["commit", "-q", "-m", "x"], {
      cwd: root,
      encoding: "utf8",
    });
  };

  it("install מחבר את .githooks", () => {
    const root = repo();
    const v = execFileSync("git", ["config", "core.hooksPath"], { cwd: root })
      .toString()
      .trim();
    expect(v).toBe(".githooks");
  });

  it("שמירה נקייה עוברת", () => {
    const root = repo();
    write(
      root,
      "app/page.tsx",
      "export default function P() { return null; }\n",
    );
    expect(commit(root, "app/page.tsx", "scripts", ".githooks").status).toBe(0);
  });

  it("קובץ .env נחסם, גם אם הוסיפו אותו בכוח", () => {
    const root = repo();
    write(root, ".env.local", "X=1\n");
    const r = commit(root, ".env.local");
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("השמירה נחסמה");
    expect(r.stderr).not.toContain("X=1");
  });

  it("כתובת וובהוק בתוך קוד נחסמת, והסוד לא מודפס", () => {
    const root = repo();
    write(root, "lib/send.ts", `export const u = "${FAKE.make}";\n`);
    const r = commit(root, "lib/send.ts");
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("lib/send.ts:1");
    expect(r.stderr).not.toContain(FAKE.make);
  });

  it("העלאה נחסמת גם כשהסוד הוסר בגרסה מאוחרת יותר", () => {
    const root = repo();
    const bare = mkdtempSync(join(tmpdir(), "guard-remote-"));
    dirs.push(bare);
    execFileSync("git", ["init", "-q", "--bare", bare]);
    execFileSync("git", ["remote", "add", "origin", bare], { cwd: root });
    write(root, "lib/send.ts", `export const u = "${FAKE.make}";\n`);
    // עוקפים בכוונה את השמירה, כדי לבדוק שגם ההעלאה תופסת
    execFileSync("git", ["add", "-A"], { cwd: root });
    execFileSync("git", ["commit", "-q", "--no-verify", "-m", "a"], { cwd: root });
    write(root, "lib/send.ts", "export const u = '';\n");
    expect(commit(root, "lib/send.ts").status).toBe(0);
    const r = spawnSync("git", ["push", "-q", "origin", "main"], { cwd: root, encoding: "utf8" });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("ההעלאה נחסמה");
    expect(r.stderr).toContain("lib/send.ts");
    expect(r.stderr).not.toContain(FAKE.make);
  });

  it("סוד שנכנס בתוך שמירת מיזוג נחסם בהעלאה", () => {
    const root = repo();
    const bare = mkdtempSync(join(tmpdir(), "guard-remote-"));
    dirs.push(bare);
    execFileSync("git", ["init", "-q", "--bare", bare]);
    execFileSync("git", ["remote", "add", "origin", bare], { cwd: root });
    write(root, "app/page.tsx", "export default function P() { return null; }\n");
    expect(commit(root, "app/page.tsx", "scripts", ".githooks").status).toBe(0);
    const g = (...a: string[]) => execFileSync("git", a, { cwd: root, stdio: "pipe" });
    g("switch", "-q", "-c", "side");
    write(root, "a.txt", "a\n");
    expect(commit(root, "a.txt").status).toBe(0);
    g("switch", "-q", "main");
    write(root, "b.txt", "b\n");
    expect(commit(root, "b.txt").status).toBe(0);
    g("merge", "-q", "--no-ff", "--no-commit", "side");
    write(root, "lib/send.ts", `export const u = "${FAKE.make}";\n`);
    g("add", "lib/send.ts");
    g("commit", "-q", "--no-verify", "-m", "merge");
    const r = spawnSync("git", ["push", "-q", "origin", "main"], { cwd: root, encoding: "utf8" });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("lib/send.ts");
  });

  it("העלאה נקייה עוברת", () => {
    const root = repo();
    const bare = mkdtempSync(join(tmpdir(), "guard-remote-"));
    dirs.push(bare);
    execFileSync("git", ["init", "-q", "--bare", bare]);
    execFileSync("git", ["remote", "add", "origin", bare], { cwd: root });
    write(root, "app/page.tsx", "export default function P() { return null; }\n");
    expect(commit(root, "app/page.tsx", "scripts", ".githooks").status).toBe(0);
    const r = spawnSync("git", ["push", "-q", "origin", "main"], { cwd: root, encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  it("install מחוץ ל-git לא עושה כלום ולא נכשל", () => {
    const root = mkdtempSync(join(tmpdir(), "noguard-"));
    dirs.push(root);
    mkdirSync(join(root, "scripts"));
    cpSync(
      join(SITE, "scripts", "secret-guard.mjs"),
      join(root, "scripts", "secret-guard.mjs"),
    );
    const r = spawnSync("node", ["scripts/secret-guard.mjs", "install"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
  });
});
