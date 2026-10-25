import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Mã lấy nguyên từ React Bits giữ đúng bản gốc, không lint
  {
    ignores: [
      "dist",
      "dist-v2",
      "**/node_modules/**",
      ".next/**",
      "next-env.d.ts",
      ".agents/**",
      ".superpowers/**",
      "test-results*/**",

      "tools",
      "data",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
);
