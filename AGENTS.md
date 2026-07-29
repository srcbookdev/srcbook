# Working in this repo

Srcbook is a local-first TypeScript notebook. A React frontend talks to an Express server that
executes code in child processes. pnpm workspaces, turbo, ESM throughout.

## Map

Start here rather than searching blind:

| Where                                 | What                                                                  |
| ------------------------------------- | --------------------------------------------------------------------- |
| `packages/api/server/ws.mts`          | Every notebook operation. Run, stop, edit, rename, deps, AI, tsserver |
| `packages/api/server/http.mts`        | All REST routes, one file                                             |
| `packages/api/server/ws-client.mts`   | The channel/topic framework the websocket is built on                 |
| `packages/api/session.mts`            | In-memory session store and cell CRUD, write-through to disk          |
| `packages/api/srcmd/`                 | The `.src.md` codec. `decoding.mts` defines the grammar               |
| `packages/api/exec.mts`               | Spawning node / tsx / npm                                             |
| `packages/shared/src/schemas/`        | Zod schemas shared by client and server. The protocol lives here      |
| `packages/web/src/routes/session.tsx` | The notebook page                                                     |
| `packages/components/src/`            | Presentational UI. `use-cell.tsx` is the client-side cell store       |
| `srcbook/src/`                        | The published CLI. Boots the server and serves the built frontend     |

Two things that are not where you'd guess:

- Notebooks are **not** in sqlite. Each one is a real directory under `~/.srcbook/srcbooks/<id>/`
  with its own `package.json` and `node_modules`. sqlite holds only config and secrets.
- `packages/web` imports `@srcbook/components` by **deep source path**
  (`@srcbook/components/src/components/ui/button`), not through its entry point. The package's
  built `dist/` and barrel file are unused.

`DECISIONS.md` explains why the system is shaped this way. `REVIEW.md` has a current critique
and the known-broken list. `tasks/` is the work queue — one file per task, status in
frontmatter. Read `DECISIONS.md` before proposing architectural changes; several obvious-looking
improvements were considered and rejected for reasons recorded there.

## Verifying your work

Node 22 (`.nvmrc`), pnpm 9.12.1 via corepack. If `pnpm` is missing, `corepack enable`.

```bash
pnpm build && pnpm lint && pnpm check-format && CI=true pnpm test
```

`CI=true` matters — the api test script is bare `vitest`, which otherwise sits in watch mode.
Turbo caches aggressively; add `--force` when you need to be sure a rebuild actually happened.

Tests are vitest, in `packages/api/test/`, globals enabled (no `import { describe }` needed).
Only `packages/api` has any. If you touch anything else, you are the first person to test it.

To exercise the real app:

```bash
pnpm --filter srcbook run build && node srcbook/dist/bin/cli.mjs start
```

It binds `127.0.0.1:2150` and writes to `~/.srcbook`. Remove that directory afterwards if it
didn't exist before you started.

Prefer verifying a claim over asserting it. The security findings in `REVIEW.md` were confirmed
with `curl` and a websocket client against a running server, and two of the fixes were wrong on
the first attempt in ways only a live test revealed.

## Code style

Match the file you're editing. Prettier and eslint are enforced in CI, so run them rather than
hand-formatting.

**Comments have a high bar.** Explain _why_, never _what_ — if a comment restates the code,
delete it. Good reasons to write one: a non-obvious constraint, an ordering that matters, a
rejected alternative, an upstream quirk you had to work around. Keep them compact; two tight
lines beat a paragraph. Don't leave comments addressed to a reviewer ("changed this because…")
— that belongs in the PR.

Other conventions already in place, worth keeping:

- `.mts` source importing `.mjs` specifiers, ESM everywhere
- Zod at every trust boundary; shared schemas so client and server can't drift
- Result objects (`{ error: true, errors }`) over exceptions in the codec
- `noUncheckedIndexedAccess` is on. Handle the `undefined`, don't cast it away

## Pull requests

Stacked PRs with [Graphite](https://graphite.dev). The repo is initialized, trunk is `main`.

```bash
gt create -m "message"   # new branch on top of current
gt submit --stack        # push and open/update PRs
gt sync                  # after a merge: pull trunk, restack, offer to delete merged branches
gt ls                    # see the stack
```

Use `gt`, not manual `git rebase`. The repo squash-merges, which breaks patch-id matching for
any branch with more than one commit — vanilla `git rebase` will replay already-merged changes
and conflict. `gt sync` handles it.

One commit per logical change. No `Co-Authored-By` trailers.

**Every PR body must open with a filetree of the changes**, because GitHub's flat file list is
hard to navigate. Plain text in a fenced block, grouped by directory, with per-file diff counts:

```
packages/api/
  server/
    security.mts          +118/-0    origin allowlist, shared by http + ws
    http.mts              +47/-58    global cors/verifyOrigin, drop 41 per-route calls
    ws-client.mts         +12/-1     reject disallowed origins at handshake
  test/
    security.test.mts     +97/-0     12 tests
turbo.json                +2/-0      declare HOST, SRCBOOK_ALLOWED_ORIGINS
```

Generate the numbers with `git diff --numstat <base>...HEAD`; the trailing note is a few words
on what changed, not a restatement of the filename.

After the tree: what changed and why, how you verified it, and anything you deliberately left
undone. Call out things you found but didn't fix, with a task number if you filed one.
