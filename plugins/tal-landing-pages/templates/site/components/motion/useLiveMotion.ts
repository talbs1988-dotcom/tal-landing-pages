"use client";

import { useReducedMotionConfig } from "motion/react";
import { useEffect, useState } from "react";

/**
 * true רק אחרי שהדף התחבר, וכשמותר לזוז. לתנועה שקשורה לגלילה (useScroll + useTransform):
 * בלי תנועה, או לפני שהדף התחבר, נותנים לאלמנט את הערך הסופי במפורש (y: 0, scale: 1,
 * clipPath: "none"). ככה תמונה לא נתקעת חתוכה או מוזזת אצל מי שעצר אנימציות.
 */
export function useLiveMotion(): boolean {
  const reduce = useReducedMotionConfig();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !reduce;
}
