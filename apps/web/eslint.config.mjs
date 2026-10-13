import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // CLAUDE.md: sin `any` sin comentario justificado.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  { ignores: [".next/**", "next-env.d.ts"] },
];

export default config;
