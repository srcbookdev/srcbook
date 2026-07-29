---
id: 0008
title: Clean up app-builder remnants and packaging debt
status: TODO
created: 2026-07-29
area: ci
---

## Why

`c7a52cc` removed the app-builder but left a trail, and packaging has drifted alongside it.
None of this is urgent; all of it is cheap, and it's the kind of debt that makes a restart
feel worse than it is.

**Dead code**

- `packages/api/ai/stream-xml-parser.mts` (207 lines) — only importer is its own test
- `packages/api/test/plan-chunks.txt`, `plan-chunks-2.txt`
- `packages/api/server/utils.mts` (`streamJsonResponse`), `constants.mts` `APPS_DIR`
- `packages/api/apps/templates/react-typescript/.gitignore` — sole survivor of a deleted tree
- `packages/api/drizzle/0011_apps_external_id_unique.sql` — absent from the journal
- `packages/shared/src/ai.mts` `isValidProvider` — zero call sites
- `packages/components/src/ui/heading.tsx` — duplicate of `src/components/ui/heading.tsx`
- `docker-compose.yml` `HOST` and `SRCBOOK_INSTALL_DEPS` — read by nothing

**Packaging**

- No `.dockerignore`, so `Dockerfile:8-9` drags the host's `node_modules` (including
  darwin-built `better-sqlite3`) into an Alpine image. Highest-value one-line fix in the repo
- `srcbook/package.json` ships 10 unused deps duplicated from `api`, plus `depcheck` as a
  production dependency; every `npx srcbook` user installs all of it
- `srcbook` has no `files` field, so `.mts` sources and tsconfigs publish
- CI uses bare `pnpm install`, so lockfile drift is never caught
- `turbo.json` defines `check-types`; nothing invokes it
- Two commits on `main` with no changeset — no release cut for the app-builder removal or
  the AI SDK bump

## Acceptance

- Dead files deleted, unused deps dropped, `.dockerignore` added
- `--frozen-lockfile` in CI, `check-types` actually wired up
- Changesets added for the unreleased commits

## Notes

Separate question, worth its own task once decided: `packages/components` is now vestigial —
one consumer, imported by deep source path rather than through its entry, so its built `dist/`
and barrel are unused while still being published. The barrel is also broken under Node ESM
(`src/index.tsx:11` is missing the `.js` extension its siblings all have). Either fold it into
`web` or make `web` import it properly.
