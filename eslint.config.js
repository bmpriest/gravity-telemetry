import tseslint from "typescript-eslint";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["**/node_modules", "**/.next", "**/dist", "**/coverage"]
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    name: "main",
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    rules: {
      "array-callback-return": ["error", { allowImplicit: true }],
      "no-template-curly-in-string": "error",
      "no-unreachable-loop": "error",
      "no-use-before-define": "error",
      "block-scoped-var": "error",
      camelcase: "error",
      "default-case": "error",
      "default-case-last": "error",
      eqeqeq: "error",
      "func-style": ["warn", "declaration"],
      "max-depth": "error",
      "no-console": ["error", { allow: ["warn", "error", "group", "groupEnd"] }],
      "no-else-return": "error",
      "no-empty-function": "error",
      "no-lonely-if": "error",
      "no-unneeded-ternary": "error",
      "no-unused-expressions": "error",
      "no-useless-computed-key": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "no-var": "error",
      "operator-assignment": "error",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-object-has-own": "error",
      "prefer-object-spread": "error",
      "prefer-template": "error",
      yoda: "error",

      "@typescript-eslint/array-type": "error",
      "default-param-last": "off",
      "@typescript-eslint/default-param-last": "error",
      "dot-notation": "off",
      "@typescript-eslint/dot-notation": "error",
      complexity: "off",

      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/consistent-type-definitions": "off"
    }
  }
];
