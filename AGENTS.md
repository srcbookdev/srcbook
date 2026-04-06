# Repository Guidelines

## Project Structure & Module Organization
This repo is a `pnpm` monorepo managed with Turborepo. Main packages live in `packages/`: `api` for the Express/Vite Node backend, `web` for the React/Vite frontend, `components` for shared UI, `shared` for cross-package schemas/types, and `configs` for shared ESLint/TypeScript config. The published CLI is in `srcbook/`. Source files live under `src/`, tests under `packages/api/test/`, static assets in `packages/web/public` and `srcbook/public`. Treat `dist/` directories as generated output.

## Build, Test, and Development Commands
Use the repo Node version from `.nvmrc` (`22.7.0`). In this shell, prefer `corepack pnpm ...`.

- `corepack pnpm install`: install workspace dependencies.
- `corepack pnpm dev`: start Turbo dev tasks for the app stack.
- `corepack pnpm build`: build every package.
- `corepack pnpm lint`: run workspace ESLint checks.
- `corepack pnpm check-format`: verify Prettier formatting.
- `corepack pnpm test`: run workspace tests; today this is primarily the API Vitest suite.
- `corepack pnpm --filter @srcbook/web check-types`: run package-level TypeScript checks. Use the same pattern for other packages.

## Coding Style & Naming Conventions
TypeScript uses ESM throughout, with `.mts` common in Node packages and `.tsx` in React packages. Prettier enforces 2-space indentation, single quotes, semicolons, and a 100-character line width. ESLint config comes from `@srcbook/configs`. Use PascalCase for React component files such as `LayoutNavbar.tsx`; use lowercase or descriptive module names for route and utility files such as `routes/home.tsx` or `utils.mts`.

## Testing Guidelines
Vitest is configured in `packages/api`; keep tests in `packages/api/test/` and name them `*.test.mts`. Store reusable fixtures near the suite, for example `packages/api/test/srcmd_files/`. No coverage threshold is configured, so add focused tests for behavior changes and run lint plus type checks for touched packages before opening a PR.

## Commit & Pull Request Guidelines
Recent history favors short, imperative commit subjects like `Remove noisy logs` or `Update README.md`. Release commits are automated as `chore: release package(s)`. Before large changes, open or confirm an issue with maintainers. PRs should include a clear description, note affected packages, pass `build`, `lint`, `check-format`, and relevant tests, and include a changeset via `corepack pnpm changeset` for user-facing changes.

## Session Notes
- 2026-04-06: Created this guide after reviewing root/package `package.json` files, `CONTRIBUTING.md`, `README.md`, and CI workflows to align commands and conventions with the current monorepo.
