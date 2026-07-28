// Unit tests for the signal engine and risk math (pure functions only — no
// React/DOM needed). Run with: npm test
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
