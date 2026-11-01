// טיפוסים ל-optimize-images.mjs, בשביל הבדיקות
export type Role = "hero" | "inline" | "thumb";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface RawImage {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}
export interface OptimizeResult {
  file: string;
  width: number;
  height: number;
  bytes: number;
  quality: number;
  source: { width: number; height: number };
  notes: string[];
}

export const ROLES: Record<Role, { maxWidth: number; maxBytes: number }>;
export const QUALITIES: number[];
export const NAME_RE: RegExp;
export const DEFAULT_OUT_DIR: string;

export function parseRect(text: string, flag?: string): Rect;
export function imageInfo(
  input: string,
): Promise<{ width: number; height: number }>;
export function redactRect(img: RawImage, rect: Rect): Promise<void>;
export function optimizeImage(o: {
  input: string;
  name: string;
  role: Role | string;
  blurs?: Array<Rect | string>;
  crop?: Rect | string;
  force?: boolean;
  outDir?: string;
}): Promise<OptimizeResult>;
export function formatResult(res: OptimizeResult, root?: string): string;
