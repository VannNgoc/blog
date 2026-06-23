import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Vendored Tiptap "simple editor" template code. These third-party files trip
  // the newer, opinionated react-hooks rules (ref access in render, setState in
  // effects, etc.) with patterns that are intentional for the template, so we
  // scope those rules off here rather than hand-editing regenerable vendor code.
  {
    files: [
      "components/tiptap-ui/**",
      "components/tiptap-ui-primitive/**",
      "components/tiptap-node/**",
      "components/tiptap-extension/**",
      "hooks/**",
      "lib/tiptap-utils.ts",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
