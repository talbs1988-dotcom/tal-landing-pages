/**
 * טקסט לפי הקהל (site.audience): לגבר, לאישה או ברבים.
 * כל עוד הקהל לא הוגדר, פונים ברבים.
 */
export type Gendered = { male: string; female: string; plural: string };

export const g = (male: string, female: string, plural: string): Gendered => ({
  male,
  female,
  plural,
});

export function pick(text: Gendered, audience: unknown): string {
  return audience === "male" || audience === "female" || audience === "plural"
    ? text[audience]
    : text.plural;
}
