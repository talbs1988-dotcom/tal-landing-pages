export const STAGES = [
  { id: "start", label: "0. הכנה", command: "/page-start" },
  { id: "brief", label: "1. אפיון", command: "/page-brief" },
  { id: "copy", label: "2. קופי", command: "/page-copy" },
  { id: "design", label: "3. עיצוב", command: "/page-design" },
  { id: "legal", label: "4. משפטי ונגישות", command: "/page-legal" },
  { id: "check", label: "5. בדיקה", command: "/page-check" },
  { id: "live", label: "6. עלייה לאוויר", command: "/page-live" },
  { id: "connect", label: "7. חיבורים", command: "/page-connect" },
];

export const STATES = {
  todo: "⬜ לא התחיל",
  doing: "🟡 בעבודה",
  done: "✅ אושר",
};

export function stageIndex(id) {
  const i = STAGES.findIndex((s) => s.id === id);
  if (i === -1) throw new Error(`שלב לא מוכר: ${id}`);
  return i;
}
