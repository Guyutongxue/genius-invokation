module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  settings: {
    jest: {
      version: 27,
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "preact",
  ],
  ignorePatterns: [
    "dist/**/*"
  ],
  overrides: [
    {
      files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 13,
    sourceType: "module",
  },
  rules: {
    semi: [0],
    "@typescript-eslint/semi": [1],
    eqeqeq: [1],
    "no-unused-vars": [0],
    "@typescript-eslint/no-unused-vars": [1],
  },
  plugins: ["@typescript-eslint", "only-warn"],
};
