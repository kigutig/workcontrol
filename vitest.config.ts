import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: [
        "src/__tests__/**",
        "src/lib/error-capture.ts",
        "src/lib/error-page.ts",
        "src/lib/lovable-error-reporting.ts",
        "src/lib/auth.tsx",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
    reporters: ["verbose", "json"],
    outputFile: {
      json: "./coverage/test-results.json",
    },
  },
});
