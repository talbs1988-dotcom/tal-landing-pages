// כלי התנועה של האתר. כולם עוצרים עם "עצירת אנימציות" ועם הגדרת "פחות תנועה" במכשיר.
// הסבר מלא ומתי משתמשים בכל אחד: references/motion.md בפלאגין.
export { EASE } from "./ease";
export { Reveal, Stagger, StaggerItem } from "./Reveal";
export { CountUp } from "./CountUp";
export { Marquee } from "./Marquee";
export { Aurora } from "./Aurora";
export { GlowCard } from "./GlowCard";
export { Parallax } from "./Parallax";
export { ScrollLine } from "./ScrollLine";
export { useLiveMotion } from "./useLiveMotion";
// לולאה או תנועה ב-JS שכתבתם בעצמכם: useReducedMotionConfig מ-motion/react (ולא useReducedMotion).
// הוא שומע גם את "עצירת אנימציות" בכפתור הנגישות (דרך MotionRoot), לא רק את הגדרת המכשיר.
