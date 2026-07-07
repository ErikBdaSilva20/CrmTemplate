import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// package.json declares "lint": "eslint ." and ships eslint/typescript-eslint/
// react-hooks/react-refresh as devDependencies, but there was no config file
// at all — `npm run lint` failed outright (AUDITORIA-CODIGO.md §6.2).
export default tseslint.config(
  // src/components/ui/** and tailwind.config.ts are protected shadcn/ui
  // vendor code (masi.template.json `editable.protect`) — not app code we
  // maintain, so they're out of lint scope rather than "fixed" in place.
  { ignores: ["dist", "node_modules", "src/components/ui/**", "tailwind.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
