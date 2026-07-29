---
id: 0002
title: Fix path traversal and shell injection
status: TODO
created: 2026-07-29
area: api
---

## Why

Two injection paths, both found by reading. Neither was exercised — both are destructive.

**Path traversal → recursive delete.** `DELETE /api/srcbooks/:id` puts `req.params.id`
straight into `Path.join(SRCBOOKS_DIR, id)` and then `fs.rm(dir, {recursive: true})`
(`server/http.mts:106` → `srcbook/index.mts:225`). Express URL-decodes params, so
`..%2F..%2F..%2FDocuments` escapes the srcbooks directory. The call is also un-awaited, so a
failure surfaces as an unhandled rejection.

**Shell injection via filename.** `formatCode` builds `` `npx prettier ${codeFilePath}` `` and
runs it through `exec`, which spawns a shell (`session.mts:330`). Renames go through
`validFilename`, but filenames from a decoded `.src.md` do not — the decoder only checks the
extension. An imported notebook with `###### $(id).mjs` reaches a shell. Same shape at
`deps.mts:56`.

## Acceptance

- Every path built from user input is resolved and asserted to be inside its expected root
- `validFilename` enforced at the decoder boundary, not just on rename
- No `exec` with an interpolated string anywhere; use `execFile` with an argument array
- Tests: traversal ids rejected, shell metacharacters in filenames rejected at decode

## Notes

A `containedPath(root, ...segments)` helper used everywhere beats auditing each call site.
