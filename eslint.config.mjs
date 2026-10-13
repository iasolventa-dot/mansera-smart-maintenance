// Lint de los paquetes (core, ui, connectors, gateway). `apps/web` tiene su propia configuración (Next).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "apps/web/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["packages/ui/**/*.tsx"], ...reactHooks.configs.flat.recommended },
  {
    rules: {
      // CLAUDE.md: sin `any` sin comentario justificado.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
