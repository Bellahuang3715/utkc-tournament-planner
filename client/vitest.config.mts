import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/openapi/**", "**/*.d.ts", "**/*.{test,spec}.{ts,tsx}"],
      reporter: ["text-summary", "lcov"],
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
