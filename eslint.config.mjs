import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        structuredClone: "readonly",
      },
    },
    ignores: ["node_modules/**", "src/content/**", "sbom.cdx.json"],
    rules: {
      "no-console": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["test/**"],
    rules: {
      "no-console": "off",
    },
  },
];
