# Dependency Upgrades

Last updated: 2026-04-06

## Current Status

- Done this session:
  - AI SDK migration landed
  - workspace `zod` bumped from `3.23.8` to `3.25.76`
  - `ai` and `@ai-sdk/*` packages aligned to current major versions
  - OpenAI-compatible providers switched to explicit `.chat(...)` calls for `baseURL` compatibility
- Verification completed:
  - `corepack pnpm install`
  - `corepack pnpm --filter @srcbook/shared check-types`
  - `corepack pnpm --filter @srcbook/api check-types`
  - `corepack pnpm --filter @srcbook/web check-types`
  - `corepack pnpm --filter @srcbook/api build`
  - `corepack pnpm --filter srcbook build`
  - `corepack pnpm --filter @srcbook/api test -- --run`
- Remaining validation:
  - live AI provider smoke tests with real credentials

## Baseline

- Pre-upgrade targeted typechecks passed:
  - `corepack pnpm --filter @srcbook/shared check-types`
  - `corepack pnpm --filter @srcbook/api check-types`
  - `corepack pnpm --filter @srcbook/web check-types`
- Current AI SDK usage is server-side and narrowly scoped to:
  - `packages/api/ai/config.mts`
  - `packages/api/ai/generate.mts`

## Recommended Sequence

1. Easy sweep: same-major patch/minor bumps with low API-change risk.
2. AI SDK stack: `ai` + `@ai-sdk/*` alignment, with a minimum `zod` bump first.
3. Tooling majors: Vite, Vitest, vite-node, TypeScript, ESLint stack.
4. Runtime/framework majors: React 19, React Router 7, Tailwind 4.
5. Backend/runtime majors: Express 5, Drizzle, `better-sqlite3`, `marked`, PostHog.

## Easy Bumps

These look like the obvious low-risk batch. They are mostly same-major upgrades, often patch/minor-only, and do not appear to require architectural changes.

- Root/tooling:
  - `@changesets/cli` `2.27.8 -> 2.30.0`
  - `prettier` `3.3.3 -> 3.8.1`
  - `turbo` `2.1.1 -> 2.9.4`
- Catalog/shared:
  - `ws` `8.18.0 -> 8.20.0`
  - `zod` `3.23.8 -> 3.25.76+` as a likely prerequisite for AI SDK
- API:
  - `cors` `2.8.5 -> 2.8.6`
  - `@types/better-sqlite3` `7.6.11 -> 7.6.13`
  - `@types/cors` `2.8.17 -> 2.8.19`
  - `@types/ws` `8.5.12 -> 8.18.1`
- Web/components leaf deps:
  - `autoprefixer` `10.4.20 -> 10.4.27`
  - `postcss` `8.4.45 -> 8.5.8`
  - `react-textarea-autosize` `8.5.3 -> 8.5.9`
  - `use-debounce` `10.0.3 -> 10.1.1`
  - `class-variance-authority` `0.7.0 -> 0.7.1`
  - `cmdk` `1.0.0 -> 1.1.1`
  - `mermaid` `11.2.0 -> 11.14.0`
  - `chalk` `5.3.0 -> 5.6.2`
- Editor/UI same-major bumps:
  - `@codemirror/*` currently have several patch/minor bumps only
  - `@radix-ui/*` currently have several same-major minor bumps only
  - `@uiw/*` currently have same-major minor bumps only

## Medium-Risk Upgrades

- AI SDK stack:
  - `ai` `3.4.33 / 3.3.33 -> 6.0.149`
  - `@ai-sdk/openai` `0.0.58 -> 3.0.51`
  - `@ai-sdk/anthropic` `0.0.49 -> 3.0.67`
  - `@ai-sdk/google` `1.0.3 -> 3.0.59`
  - `@ai-sdk/provider` `1.0.1 -> 3.0.8`
- Type/tooling:
  - `typescript` `5.6.2 -> 6.0.2`
  - `@types/node` `20.14.2 / 22.5.4 -> 25.5.2`
  - `eslint` `8.57.0 -> 10.2.0`
  - `@typescript-eslint/*` `8.5.0 -> 8.58.0`
- Data/runtime:
  - `drizzle-kit` `0.24.2 -> 0.31.10`
  - `drizzle-orm` `0.33.0 -> 0.45.2`
  - `posthog-node` `4.2.0 -> 5.28.11`
  - `posthog-js` `1.174.2 -> 1.364.7`

## Likely Gnarly

- React stack:
  - `react` `18.3.1 -> 19.2.4`
  - `react-dom` `18.3.1 -> 19.2.4`
  - `@types/react` `18.3.5 -> 19.2.14`
  - `@types/react-dom` `18.3.0 -> 19.2.3`
  - `react-router-dom` `6.26.2 -> 7.14.0`
- CSS/build:
  - `tailwindcss` `3.4.11 -> 4.2.2`
  - `tailwind-merge` `2.5.2 -> 3.5.0`
  - `@vitejs/plugin-react-swc` `3.7.0 -> 4.3.0`
  - `vite` `5.4.4 -> 8.0.5`
  - `vite-node` `2.0.5 -> 6.0.0`
  - `vitest` `2.0.5 -> 4.1.2`
- Backend/runtime:
  - `express` `4.20.0 -> 5.2.1`
  - `better-sqlite3` `11.3.0 -> 12.8.0`
  - `marked` `14.1.2 -> 17.0.6`
  - `marked-react` `2.0.0 -> 4.0.0`
  - `zod` `3.x -> 4.x` as a separate workspace-wide migration if we choose that path later

## AI SDK Focus

Status: compile/build/test migration completed on 2026-04-06. Live credential-backed smoke testing is still pending.

Important constraints:

- The repo currently uses:
  - `createOpenAI`
  - `createAnthropic`
  - `createGoogleGenerativeAI`
  - `generateText`
- The repo does not currently use:
  - `streamText`
  - `streamObject`
  - AI SDK UI hooks/components
  - tool-calling flows in local code
- The current OpenAI provider docs still support `createOpenAI({ baseURL })`.
- Since AI SDK 5, the OpenAI provider uses the Responses API by default. If behavior shifts for specific models, we may need to explicitly choose `.chat(...)` for compatibility.
- Official docs recommend `zod 4.1.8+` for AI SDK 5+, but current npm peer deps for `ai@6.0.149` allow `zod ^3.25.76 || ^4.1.8`.
- In practice for this repo, explicit `.chat(...)` calls are now used for OpenAI-compatible `baseURL` providers to avoid accidental Responses API routing for OpenRouter, xAI, and custom endpoints.

Recommended upgrade strategy for AI SDK:

1. Done: bump workspace `zod` from `3.23.8` to latest `3.25.x`.
2. Done: align all AI SDK packages together.
3. Done: run targeted typechecks for `@srcbook/shared`, `@srcbook/api`, and `@srcbook/web`.
4. Pending: smoke-test AI provider selection paths:
   - OpenAI strict
   - Anthropic
   - Gemini
   - OpenRouter / xAI / custom `baseURL`
5. Done for compatibility endpoints: explicit `.chat(...)` selection is already in place where needed.

## References

- AI SDK 3.4 -> 4.0 migration guide: https://ai-sdk.dev/docs/migration-guides/migration-guide-4-0
- AI SDK 4.x -> 5.0 migration guide: https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0
- AI SDK 5.x -> 6.0 migration guide: https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
- Current OpenAI provider docs: https://ai-sdk.dev/providers/ai-sdk-providers/openai

## Next Suggested Work

- Optional quick win:
  - land a same-major easy-bumps batch first
- Strong candidate after that:
  - same-major easy-bumps batch
- AI-specific follow-up:
  - credential-backed smoke tests for each configured provider path
- Explicitly avoid starting with:
  - React 19
  - Tailwind 4
  - Express 5
