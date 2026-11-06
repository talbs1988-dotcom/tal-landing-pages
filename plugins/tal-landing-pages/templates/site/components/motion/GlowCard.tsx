"use client";

import { useRef, type HTMLAttributes, type PointerEvent } from "react";

/**
 * כרטיס עם הילה שעוקבת אחרי העכבר (בטלפון: הילה קבועה ועדינה בפינה).
 * ההילה בצבע ה-accent של המותג. בלי JS, או עם "עצירת אנימציות", זה כרטיס רגיל עם מסגרת.
 */
export function GlowCard({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onPointerMove={move} className={`glow-card relative overflow-hidden rounded-3xl ${className}`} {...rest}>
      {children}
    </div>
  );
}
