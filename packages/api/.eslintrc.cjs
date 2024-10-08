/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve('@srcbook/configs/eslint/library.js')],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.lint.json',
    tsconfigRootDir: __dirname,
  },
  globals: {
    Bun: false,
  },
  ignorePatterns: ['apps/templates/**/*'],
};
