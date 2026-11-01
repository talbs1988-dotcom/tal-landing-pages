import { describe, expect, it, vi } from "vitest";
import { backupPath, createBlobBackup } from "@/lib/backup";
import { buildLeadRecord } from "@/lib/lead";
import { pickTracking } from "@/lib/utm";

const record = buildLeadRecord(
  { name: "דנה", email: "d@example.com", phone: "", marketingConsent: false },
  pickTracking({}),
  {
    now: new Date("2026-11-01T22:30:00.000Z"),
    baseUrl: new URL("https://example.co.il"),
  },
);

describe("backupPath", () => {
  it("leads/<תאריך בישראל>/<id>.json", () => {
    // 22:30 UTC ב-1.11 הוא כבר 2.11 בישראל
    expect(backupPath(record)).toBe(`leads/2026-11-02/${record.id}.json`);
  });
});

describe("createBlobBackup", () => {
  it("שומר JSON פרטי, בלי להחזיר את הכתובת", async () => {
    const put = vi.fn(async () => ({
      url: "https://store.private.blob.vercel-storage.com/x",
    }));
    const backup = createBlobBackup(put);
    const result = await backup(record);
    expect(result).toBeUndefined();
    expect(put).toHaveBeenCalledTimes(1);
    const [path, body, opts] = put.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(path).toBe(backupPath(record));
    expect(JSON.parse(body)).toEqual(record);
    expect(opts).toMatchObject({
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  });

  it("שגיאה מהאחסון עולה למעלה (handleLead מטפל בה)", async () => {
    const put = vi.fn(async () => {
      throw new Error("store is public");
    });
    await expect(createBlobBackup(put)(record)).rejects.toThrow();
  });
});
