---
'@srcbook/api': patch
---

Close path traversal and shell injection paths.

`DELETE /api/srcbooks/:id` could delete directories outside the srcbooks directory, and
`POST /api/file` could read any file on disk. Both are now confined to `SRCBOOKS_DIR`.

Cell filenames are validated when a `.src.md` is decoded rather than only on rename, so an
imported notebook can no longer introduce a filename that reaches a shell. Prettier and
depcheck are invoked with argument arrays instead of interpolated command strings.

`POST /api/settings` now validates its body against an allowlist. It previously wrote any
column of the config row, including `aiBaseUrl`, which controls where AI requests and the
user's API key are sent.

Also fixes formatting reporting failure when prettier writes a warning to stderr but exits
successfully.
