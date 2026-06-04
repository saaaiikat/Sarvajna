import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    globals: false,
  },
  oxc: {
    transform: {
      jsx: {
        runtime: "automatic",
        importSource: "react",
      },
    },
  },
});
