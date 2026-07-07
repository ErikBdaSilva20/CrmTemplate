import { defineConfig } from "vitest/config";
import path from "path";

// Separate from vite.config.ts (build config, protected) so the test runner
// has its own entry point. Enables the app before this had `vitest` in
// devDependencies and `vitest/globals` in tsconfig, but zero test files and
// no "test" script (AUDITORIA-CODIGO.md §6.2).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
