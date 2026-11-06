/**
 * מקום של תמונה בגלריה בלבד. בדף אמיתי: next/image עם תמונה מ-public/assets,
 * width/height מהסקריפט של התמונות, ו-alt={alt("<שם>")}.
 */
export function DemoImage({ label, ratio = "4 / 3", className = "", tone = "light" }: { label: string; ratio?: string; className?: string; tone?: "light" | "dark" }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative grid place-items-center overflow-hidden rounded-[inherit] ${className}`}
      style={{
        aspectRatio: ratio,
        background:
          tone === "dark"
            ? "radial-gradient(120% 90% at 80% 10%, color-mix(in oklab, var(--brand-accent) 45%, transparent), transparent 55%), linear-gradient(160deg, color-mix(in oklab, var(--brand-secondary) 70%, #000), var(--brand-secondary))"
            : "radial-gradient(120% 90% at 80% 10%, color-mix(in oklab, var(--brand-accent) 35%, transparent), transparent 55%), linear-gradient(160deg, color-mix(in oklab, var(--brand-background) 70%, var(--brand-accent)), var(--brand-background))",
      }}
    >
      <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white backdrop-blur">{label}</span>
    </div>
  );
}
