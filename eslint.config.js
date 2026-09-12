import globals from "globals";
import eslintJs from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig({
  files: ["src/renderer/**/*.{js,jsx}"],

  extends: [
    eslintJs.configs.recommended,
    eslintReact.configs.recommended,
  ],

  languageOptions: {
    globals: {
      ...globals.browser,
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },

  rules: {
    "@eslint-react/no-missing-key": "warn",
  },
});