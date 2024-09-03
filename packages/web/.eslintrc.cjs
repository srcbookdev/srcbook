// module.exports = {
//   root: true,
//   env: { browser: true, es2020: true, 'jest/globals': true },
//   extends: [
//     'eslint:recommended',
//     'plugin:@typescript-eslint/recommended',
//     'plugin:react-hooks/recommended',
//     'prettier',
//   ],
//   ignorePatterns: ['dist', '.eslintrc.cjs'],
//   parser: '@typescript-eslint/parser',
//   plugins: ['react-refresh', 'prettier', 'jest'],
//   rules: {
//     'prettier/prettier': 'error',
//     '@typescript-eslint/no-unused-vars': [
//       'warn', // or "error"
//       {
//         argsIgnorePattern: '^_',
//         varsIgnorePattern: '^_',
//         caughtErrorsIgnorePattern: '^_',
//       },
//     ],
//   },
// };

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve('@srcbook/configs/eslint/react-library.js')],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.lint.json',
    tsconfigRootDir: __dirname,
  },
};
