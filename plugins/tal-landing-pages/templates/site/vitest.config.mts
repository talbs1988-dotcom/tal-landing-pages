import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // הכינוי @/ מגיע מ-tsconfig.json, כדי שיהיה לו מקור אחד בלבד
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
