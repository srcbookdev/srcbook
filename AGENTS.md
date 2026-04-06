# AGENTS.md

This file is the persistent working log for Codex sessions in this repo. Append dated notes as work happens, especially commands run, results, breakages, and decisions.

## Repo Notes

- Workspace manager: `pnpm` via Corepack. In this shell, `pnpm` is not on `PATH`; use `corepack pnpm ...`.
- Repo `.nvmrc`: `22.7.0`
- Current shell when this file was created on 2026-04-06: Node `v24.14.1`, npm `11.11.0`, Corepack pnpm `9.12.1`
- Monorepo packages:
  - root workspace
  - `packages/api`
  - `packages/web`
  - `packages/components`
  - `packages/shared`
  - `packages/configs`
  - `srcbook`
- Dependency upgrade tracker: `dependency-upgrades.md`

## Working Conventions

- Prefer one dependency upgrade focus at a time.
- After each dependency change:
  - run install/update
  - run targeted typechecks/tests for affected packages
  - record results here
  - update `dependency-upgrades.md`
- Do not assume `pnpm outdated -r` returning exit code `1` means failure; it returns `1` when outdated packages are found.

## Work Log

### 2026-04-06

- Initial dependency inventory:
  - read workspace manifests: root `package.json`, `pnpm-workspace.yaml`, `packages/*/package.json`, `srcbook/package.json`
  - confirmed there was no existing `AGENTS.md` or upgrade-tracker file
- Commands run:
  - `corepack pnpm -v`
    - result: `9.12.1`
  - `corepack pnpm outdated -r`
    - result: succeeded, returned the workspace outdated report
  - `corepack pnpm outdated -r --format json`
    - result: succeeded, used for risk classification
  - `corepack pnpm --filter @srcbook/shared check-types`
    - result: passed
  - `corepack pnpm --filter @srcbook/api check-types`
    - result: passed
  - `corepack pnpm --filter @srcbook/web check-types`
    - result: passed
- AI SDK scope findings:
  - current AI SDK usage is concentrated in:
    - `packages/api/ai/config.mts`
    - `packages/api/ai/generate.mts`
  - current code already uses `createOpenAI`, `createAnthropic`, `createGoogleGenerativeAI`, and `generateText`
  - there are no local `streamText`, `streamObject`, or AI SDK UI hooks to migrate
- Current AI SDK registry snapshot checked on 2026-04-06:
  - `ai` latest dist-tag: `6.0.149`
  - `@ai-sdk/openai` latest dist-tag: `3.0.51`
  - `@ai-sdk/anthropic` latest dist-tag: `3.0.67`
  - `@ai-sdk/google` latest dist-tag: `3.0.59`
  - `@ai-sdk/provider` latest dist-tag: `3.0.8`
- AI SDK migration notes from official docs checked on 2026-04-06:
  - official migration guides exist for `3.4 -> 4.0`, `4.x -> 5.0`, and `5.x -> 6.0`
  - current OpenAI provider docs still support `createOpenAI({ baseURL })`
  - since AI SDK 5, the OpenAI provider uses the Responses API by default unless `openai.chat(...)` or `openai.completion(...)` is selected explicitly
- Zod constraint:
  - repo catalog is currently `zod@3.23.8`
  - npm peer deps for `ai@5.0.168` and `ai@6.0.149` allow `zod ^3.25.76 || ^4.1.8`
  - minimum low-disruption prerequisite for AI SDK is likely bumping the workspace to `zod@3.25.76` or later `3.x`
- Initial judgment:
  - there is a real batch of easy same-major bumps available
  - AI SDK is behind by multiple majors, but the local code surface is small enough that it does not look like the gnarliest upgrade in the repo
  - likely gnarlier later items: React 19, Tailwind 4, Express 5, Vite/Vitest major jumps, broader Zod 4 migration
- Additional inspection before changing code:
  - unpacked `@ai-sdk/openai@3.0.51` and `ai@6.0.149` into `/tmp` to inspect current types and provider behavior
  - confirmed `createOpenAI` no longer accepts a `compatibility` option
  - confirmed `createOpenAI(model)` now creates a Responses API model by default
  - conclusion: OpenRouter, xAI, and custom `baseURL` paths should explicitly use `.chat(model)` after the upgrade to preserve OpenAI-compatible chat-completions behavior
- AI SDK upgrade implemented on 2026-04-06:
  - updated workspace catalog:
    - `zod` -> `^3.25.76`
    - `ai` -> `^6.0.149`
    - `@ai-sdk/anthropic` -> `^3.0.67`
    - `@ai-sdk/google` -> `^3.0.59`
    - `@ai-sdk/openai` -> `^3.0.51`
    - `@ai-sdk/provider` -> `^3.0.8`
  - aligned `packages/api`, `packages/shared`, and `srcbook` to the catalog versions
  - updated `packages/api/ai/config.mts`:
    - removed the old `compatibility` option
    - switched OpenAI-family providers to explicit `.chat(model)` calls
  - updated `packages/api/ai/generate.mts`:
    - `generateSrcbook` now returns plain text instead of leaking the raw `GenerateTextResult` type
  - updated `packages/api/server/http.mts` to match the narrower `generateSrcbook` return type
- Commands run after the AI SDK edit:
  - `corepack pnpm install`
    - result: passed, lockfile updated
  - `corepack pnpm --filter @srcbook/shared check-types`
    - result: passed
  - `corepack pnpm --filter @srcbook/api check-types`
    - first result: failed with `TS4058` because an exported function returned an AI SDK generic type that `tsc` could not name in declarations
    - fix: narrowed `generateSrcbook` to `Promise<string>`
    - second result: passed
  - `corepack pnpm --filter @srcbook/web check-types`
    - result: passed
  - `corepack pnpm --filter @srcbook/api build`
    - result: passed
  - `corepack pnpm --filter srcbook build`
    - result: passed
  - `corepack pnpm --filter @srcbook/api test -- --run`
    - result: passed, `3` test files and `11` tests
- Remaining AI SDK follow-up:
  - compile/build/test verification is green
  - live provider smoke tests still need real API keys/config to verify OpenAI, Anthropic, Gemini, OpenRouter, xAI, and custom `baseURL` paths end-to-end
