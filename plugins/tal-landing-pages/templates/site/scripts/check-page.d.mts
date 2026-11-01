// טיפוסים ל-check-page.mjs, בשביל הבדיקות
export interface CheckResult {
  name: string;
  /** true = עבר, false = נכשל, null = לא נבדק */
  ok: boolean | null;
  required: boolean;
  details: string;
  items?: string[];
}

export const IMAGE_CAPS: { hero: number; inline: number };
export const AI_PATTERNS: [RegExp, string][];

export function configValue(
  text: string,
  section: string,
  key: string,
): string | null | undefined;
export function isHttpsUrl(v: string): boolean;
export function checkTodos(root: string): CheckResult & { items: string[] };
export function checkPageUrl(configText: string): CheckResult;
export function checkImages(
  assetsDir: string,
): CheckResult & { items: string[] };
export function checkCopyJson(
  copy: Record<string, unknown>,
  voiceText?: string,
): CheckResult & { items: string[] };
export function copyVariation(copyMd: string | null | undefined): string | null;
export function checkCtas(
  copy: Record<string, unknown>,
  o?: { submitLabel?: string | null; variation?: string | null },
): CheckResult & { items: string[] };
export function checkCopyMd(
  copyMdPath: string,
  copyScanPath: string | undefined,
): Promise<CheckResult & { items?: string[] }>;
export function runNpm(
  root: string,
  script: string,
  o?: { timeout?: number },
): { status: number | null; output: string; error?: Error };
export function runChecks(
  root: string,
  o?: { copyScan?: string; skip?: string[]; copyMd?: string; voice?: string },
): Promise<{ ok: boolean; checks: CheckResult[] }>;
