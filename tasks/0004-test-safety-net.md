---
id: 0004
title: Build a test safety net for the untested core
status: TODO
created: 2026-07-29
area: api
---

## Why

11 tests exist, all in `packages/api`. They cover the srcmd decoder, tsserver message framing,
and one module that is dead code. Zero tests in `web`, `components`, `shared`, or the CLI.
No HTTP tests, no websocket tests, no execution tests.

Restarting a dormant project without a safety net means re-breaking things silently. The
framing tests show the instinct is there — they cover multi-byte UTF-8 split across chunk
boundaries, which is exactly the right kind of test. The gap is that the riskiest code has none.

## Acceptance

Cover, in rough priority order:

- `Channel.match` — topic parsing and wildcard extraction. Pure, total, currently untested
- `Processes` — add/kill/clobber semantics, including the double-exec case in task 0005
- srcmd round-trip as a property test over generated cell arrays, including the external
  (directory) form, which has no round-trip test today
- `shouldNpmInstall` — pure given fixture package.json/package-lock.json pairs
- HTTP routes via supertest, especially the security boundaries from tasks 0001 and 0002

## Notes

`packages/api/package.json` runs bare `vitest`, relying on CI auto-detection to avoid watch
mode. Prefer `vitest run` for the CI script and keep `vitest` as a separate `test:watch`.
