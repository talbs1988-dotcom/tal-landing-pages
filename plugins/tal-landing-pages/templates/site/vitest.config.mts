import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // הכינוי @/ מגיע מ-tsconfig.json, כדי שיהיה לו מקור אחד בלבד
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // הבדיקות בודקות את נוסח התבנית, גם בדף שבעל העסק שם בו נוסח משלו (content/legal/)
    env: { LEGAL_TEXT_DIR: "tests/no-legal-texts" },
  },
});
