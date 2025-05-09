import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  eslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tseslintParser,
      globals: {
        Headers: "readonly",
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
    },
  },
  {
    ignores: ["docs/**", "coverage/**", "dist/**"],
  },
  {
    files: ["test-utils.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
