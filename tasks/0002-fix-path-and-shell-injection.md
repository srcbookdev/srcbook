---
id: 0002
title: Fix path traversal and shell injection
status: DONE
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

Done. `path-utils.mts` holds `containedPath` / `requireContainedPath`.

The containment check compares against `root + path.sep`, not `root` alone — otherwise
`/tmp/srcbooks-evil` passes a `startsWith('/tmp/srcbooks')` test while being a completely
different directory. There's a test for exactly that.

`POST /api/file` is confined to `SRCBOOKS_DIR` rather than deleted, because go-to-definition
genuinely needs it: tsserver reports paths into a srcbook's own `src/` _and_ into type
declarations under its `node_modules`, and `SRCBOOKS_DIR` covers both.

Filename validation had to cover the link target as well as the h6 heading. The external
(on-disk) form is `###### foo.ts` followed by `[foo.ts](./src/foo.ts)`, and it's the link text
that becomes the filename — validating only the heading would have left the path open.

While in `formatCode`: prettier writes warnings to stderr while still exiting 0, and the old
code treated any stderr output as failure. Now only a non-zero exit is an error.

Two things noticed here and deliberately left for their own tasks: `decode()` still throws
instead of returning `{error: true}` when metadata is missing, and `encode()` still assumes
`cells[0]`/`cells[1]` are the title and package.json. Both are in `REVIEW.md` §2.2.
