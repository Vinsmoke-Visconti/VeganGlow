import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/legacy-pages/**",
  ]),
  {
    rules: {
      // React compiler rules — downgraded to warn (no runtime impact)
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // img tag warnings — keep as warn, not blocking CI
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
