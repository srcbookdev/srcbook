# Design review — July 2026

A formal review of srcbook as a prototype being restarted. Written from a full read of the
codebase plus empirical testing against a running instance (`srcbook@0.0.19`, Node 24).

**Baseline health:** the monorepo installs, builds, and passes its 11 tests cleanly on Node
24 with no changes. That's better than most two-year-dormant projects.

The review is in three parts: security (fix before touching anything else), the design forks
worth reconsidering, and the code-quality pass.

---

## 1. Security: the local-app assumption is the central bug

This is not a hypothetical. All of the following were confirmed against a live server.

The server binds `0.0.0.0`, every route is wrapped in bare `cors()` (`Access-Control-Allow-
Origin: *`), the websocket does no origin check, and there is no authentication anywhere.
"It runs locally" was treated as a trust boundary. It is not one — every web page the user
visits can reach `localhost`, and every device on the network can reach `0.0.0.0`.

Verified:

```
$ lsof -nP -iTCP:2150 -sTCP:LISTEN
node  ...  TCP *:2150 (LISTEN)                      # all interfaces

$ curl -H "Origin: https://evil.example.com" localhost:2150/api/settings
Access-Control-Allow-Origin: *
{"result":{"openaiKey":...,"anthropicKey":...,"xaiKey":...}}   # all provider keys

$ curl -H "Origin: https://evil.example.com" -d '{"file":"/etc/hosts"}' localhost:2150/api/file
{"result":{"content":"##\n# Host Database\n..."}}              # arbitrary file read

$ node -e "new WebSocket('ws://localhost:2150/websocket', {headers:{Origin:'https://evil.example.com'}})"
WS ACCEPTED from foreign Origin https://evil.example.com       # no origin check
```

The websocket acceptance is what turns this from disclosure into remote code execution: a
malicious page can list sessions over HTTP, then push `cell:update` followed by `cell:exec`
to run arbitrary code as the user. No user interaction beyond visiting the page.

Two more, found by reading rather than testing (not exercised, because both are destructive):

- **Path traversal to recursive delete.** `DELETE /api/srcbooks/:id` passes `req.params.id`
  straight into `Path.join(SRCBOOKS_DIR, id)` and then `fs.rm(dir, {recursive: true})`
  ([http.mts:106](packages/api/server/http.mts:106) → [index.mts:225](packages/api/srcbook/index.mts:225)).
  Express URL-decodes params, so `..%2F..%2F..%2FDocuments` escapes the srcbooks directory.
- **Shell injection through a cell filename.** `formatCode` builds
  `` `npx prettier ${codeFilePath}` `` and runs it through `exec`, which uses a shell
  ([session.mts:330](packages/api/session.mts:330)). Renames are validated by `validFilename`,
  but filenames arriving from a _decoded `.src.md`_ are not — the decoder only checks the
  extension. An imported notebook containing `###### $(id).mjs` reaches a shell. Same shape at
  [deps.mts:56](packages/api/deps.mts:56).

Also worth fixing: `POST /api/settings` passes `req.body` unvalidated into
`db.update(configs).set(...)`, so an attacker can set `aiBaseUrl` and redirect the user's
subsequent AI calls — and their API key — to an endpoint of their choosing.

**Recommendation.** Bind `127.0.0.1` by default. Drop blanket `cors()` in favour of an
explicit localhost allowlist. Add origin verification to the websocket upgrade. Delete
`POST /api/file` or restrict it to `SRCBOOKS_DIR`. Resolve-and-contain every path built from
user input. Use `execFile` rather than `exec` everywhere. Validate the settings body with zod.

None of this compromises the local-first design; it just stops treating "local" as "safe".

---

## 2. Design forks worth reconsidering

### 2.1 Execution model — the big one

Fresh process per cell is a real choice with real benefits (see `DECISIONS.md` #2): honest
Node semantics, no hidden kernel state, and the notebook is a program you can also run with
plain `node`. But it means srcbook is not a notebook in the sense most users expect. You
cannot bind a value in one cell and use it in the next. Every run pays process startup plus
tsx transpile.

The interesting comparison is Livebook, which srcbook takes inspiration from. Livebook has
persistent BEAM process state _and_ reproducibility, because Elixir gives it immutability
and supervised processes for free. JavaScript gives you neither, so you have to pick.

Three coherent positions:

1. **Stay stateless, and say so.** Lean into "literate program, not scratchpad". Then invest
   in what that model makes possible: fast reruns, a "run all" that's genuinely reproducible,
   watch mode, importable notebooks. The main fix needed is latency — a warm tsx process pool
   would cut most of the per-run cost.
2. **Add an opt-in kernel.** A long-lived worker per notebook that evaluates cells into a
   shared context. This is what unlocks data-exploration workflows. It costs you a
   "restart kernel" concept and the out-of-order-execution confusion that plagues Jupyter.
3. **Hybrid.** Stateless by default, with a per-notebook toggle. Attractive, but two
   execution semantics means every feature is designed twice — this is the expensive option
   dressed as a compromise.

My read: (1) is the honest position and the one the current architecture already earns.
The differentiator against Jupyter isn't "notebook for TypeScript" — it's "a runnable,
reviewable, diffable document that happens to have a nice editor". Chasing kernel state
gives up that advantage to compete on Jupyter's turf. But this deserves an explicit decision,
because right now it reads as an implementation detail rather than a stance.

Regardless of which is chosen: there are no execution timeouts, no output limits, and no
memory limits. A cell containing `while(true) console.log('x')` will stream unbounded output
over the websocket until the browser dies. `SIGTERM` is sent to the `tsx` wrapper, not the
process group, so grandchildren survive a stop.

### 2.2 The `.src.md` format

The core instinct — markdown that renders and diffs well — is right, and it's the most
defensible thing about the project. `.ipynb` diffs are notoriously unreadable; a `.src.md`
reviews like prose. Keep this.

The fragilities are in the grammar, not the concept:

- **h6 is overloaded.** Any h6 in prose becomes a filename marker. The delimiter is doing
  double duty as both markdown structure and cell boundary. A fenced-block info-string
  convention (` ```ts filename=foo.ts `) would be unambiguous and still render fine.
  That's a breaking format change, so it belongs in a v2 discussion — but the current
  ambiguity is worth documenting even if you keep it.
- **The grammar is defined by the decoder, not a spec.** There's no formal description of
  what's valid, so the only way to know is to read `decoding.mts`. For a format whose whole
  pitch is portability, that's a gap. A one-page spec plus a corpus of fixture files
  (valid and invalid) would make third-party implementations possible.
- **`encode()` assumes cell ordering that `decode()` never enforces.**
  [encoding.mts:17](packages/api/srcmd/encoding.mts:17) casts `cells[0]` to a title and
  `cells[1]` to a package.json positionally. The decoder has a standing TODO admitting it
  doesn't guarantee that. A notebook with a paragraph before `###### package.json` — easily
  produced by AI generation — throws a `TypeError` on export.
- **Round-trip is tested for the inline form only,** by a single assertion. The external
  (directory) form, which is what's actually on disk, has no round-trip test at all.
- **`decode()` throws instead of returning `{error: true}`** when metadata is missing
  ([decoding.mts:92](packages/api/srcmd/decoding.mts:92)), violating the `DecodeResult`
  contract every caller checks.

Highest-value work here is a property test: generate arbitrary cell arrays, round-trip them,
assert equality. That would have caught all of the above.

### 2.3 Session state ownership

`packages/api/session.mts` mixes two update styles. `updateCellWithRollback` mutates
`session.cells` on the existing object; `updateSession` replaces the object in the map
(`sessions[id] = {...session, ...updates}`). Every exec callback closes over a session
reference captured at spawn time.

The concrete bug: delete a cell while it's running, and the exit handler looks the cell up in
its _stale_ `session.cells` array, finds it, sets `status: 'idle'`, and broadcasts it — the
client resurrects a deleted cell. The code comments know: `// TODO: Real state management pls.`

Fix is not exotic — make the session store the only thing that mutates sessions, have handlers
re-read by id rather than closing over the object, and pick one of mutable or immutable. But
it needs to happen before any multi-client or collaboration work, because it's the foundation
those would sit on.

### 2.4 The websocket layer

The typed-schema-per-event design shared across client and server is genuinely good and worth
keeping. Three structural gaps:

- **No request/response correlation.** tsserver replies (`quickinfo`, `completions`,
  `definition`) are _broadcasts_ carrying no `cellId` and no request id
  ([websockets.mts:115-130](packages/shared/src/schemas/websockets.mts:115)). The client
  registers a global listener and assumes the next response is its own. Two cells requesting
  completions concurrently resolve each other's promises. Adding a `ref` field to the envelope
  fixes an entire class of bug.
- **Subscriptions don't survive reconnect.** The client reconnects with backoff and flushes
  its queue, but never re-sends `subscribe`; `Channel.subscribed` stays `true` so it never
  re-handshakes. Server-side subscriptions are per-connection and die with the socket. After
  any reconnect the UI still sends but receives nothing — run a cell after a server restart
  and it hangs on "running" forever.
- **Handler rejections are unhandled.** [ws-client.mts:250](packages/api/server/ws-client.mts:250)
  calls `handler(...)` with no `await` or `.catch()`, and every handler is `async` and throws
  freely (`findSession` throws on unknown ids). A stale session id from a reconnecting client
  crashes the server.

### 2.5 Per-notebook `node_modules`

Correct for compatibility (decision #1), expensive in practice: a full dependency tree per
notebook, and a slow first-run before anything works. Worth exploring a shared content-
addressed store with per-notebook symlinks — pnpm's model — which would preserve the "it's a
real project" property while collapsing disk and install time. Not urgent, but it's the thing
that will feel worst as a user accumulates notebooks.

### 2.6 Privacy: analytics capture user prompts

`posthog.capture` sends the user's AI prompt text as an event property — the `query` for
notebook generation ([http.mts:151](packages/api/server/http.mts:151)) and `prompt` for cell
edits ([ws.mts:399](packages/api/server/ws.mts:399)). Prompts routinely contain proprietary
code, business context, and personal information.

The privacy policy states no PII is collected. That claim and this code cannot both be true.
This is on by default in production builds, opt-_out_ via `SRCBOOK_DISABLE_ANALYTICS`. Drop
the prompt contents from the payload (keep the event and its length if the metric matters),
and consider making analytics opt-in on first run.

---

## 3. Code quality

### Crashers

The server has several paths where a single bad input takes the whole process down. For a
tool that holds unsaved user work, these matter more than their individual severity suggests.

1. **`deps.mts:64` throws inside an `exec` callback.** Not in the promise executor — in the
   callback — so the surrounding `try/catch` cannot catch it and the promise never settles.
   Any depcheck output without a `{...}` match kills the process. This runs on _every cell
   execution_.
2. **Unhandled rejections from every websocket handler** (§2.4).
3. **Unvalidated envelope.** [ws-client.mts:204](packages/api/server/ws-client.mts:204) does
   `JSON.parse(message)` inside a synchronous listener. One malformed frame ends the process.
   (Per-event payloads _are_ safely parsed — only the envelope isn't.)
4. **`process.send` is called unguarded** ([server.mts:59](srcbook/src/server.mts:59)) behind a
   `@ts-ignore`. It only exists when spawned with IPC, so running the server directly crashes
   it _after_ printing "running at http://localhost:2150" — it looks healthy, then dies.
   Confirmed by running it.
5. **tsserver stdout parse errors are fatal** — `parse()` throws inside a `'data'` listener.
6. **Process registry clobbering.** [processes.mts:17](packages/api/processes.mts:17) keys on
   `sessionId:cellId`. A double-exec overwrites the entry, and the _first_ process's exit
   handler then deletes the key belonging to the _second_ — leaving an orphaned, unkillable
   process while `cell:stop` reports "no process exists".
7. **tsserver request promises never settle on failure.**
   [tsserver.mts:84](packages/api/tsserver/tsserver.mts:84) stores a resolver by `seq` with no
   timeout and no reject path. If tsserver dies, every pending hover/completion hangs forever
   and the resolver map leaks.

### Testing

11 tests, all in `packages/api`, covering the srcmd decoder, tsserver message framing, and a
module that is dead code. Zero tests in `web`, `components`, `shared`, or the CLI. No HTTP
tests, no websocket tests, no execution tests.

The framing tests are genuinely good — they cover multi-byte UTF-8 split across chunks, which
is exactly the subtle thing worth testing. The gap is that the highest-risk code has none:
`server/ws.mts` (892 lines, every handler), `session.mts` (cell CRUD and rollback),
`exec.mts`, `processes.mts`, `deps.mts`, and the channel-matching logic in `ws-client.mts`.

Best first targets, in order — all pure or easily isolated, all currently zero-coverage:

- `Channel.match` topic/wildcard parsing — pure, total, trivially testable
- `Processes` add/kill/clobber semantics — pure state machine
- srcmd round-trip as a property test, including the external form
- `shouldNpmInstall` dependency comparison — pure given fixture files
- HTTP route tests via supertest, especially the security boundaries

### Dead code

The app-builder removal (`c7a52cc`) left a lot behind: `ai/stream-xml-parser.mts` (207 lines,
still tested), `test/plan-chunks*.txt`, `server/utils.mts`, `constants.mts` `APPS_DIR`,
`packages/api/apps/templates/react-typescript/.gitignore`, and an orphaned drizzle migration
(`0011_apps_external_id_unique.sql`, absent from the journal).

`packages/components` is now vestigial. It existed to share UI between the notebook and the
app-builder; with the app-builder gone there's exactly one consumer. Worse, `web` imports it
by deep source path (`@srcbook/components/src/components/ui/button`) rather than through its
entry point, so the built `dist/` and the whole barrel file are unused — while still being
published to npm at 0.0.7. The published barrel is also broken: `src/index.tsx:11` is missing
the `.js` extension that every sibling line has, so `dist/index.js` is unimportable under
Node ESM. Either fold `components` back into `web` or make `web` import it properly; the
current arrangement has the costs of a package boundary with none of the benefits.

### Packaging

- **No `.dockerignore`.** `Dockerfile:8-9` copies `packages/` and `srcbook/` wholesale, so a
  local build drags the host's `node_modules` — including darwin-compiled `better-sqlite3`
  binaries — into an Alpine image. Highest-value one-line fix in the repo.
- **`srcbook` ships 10 unused dependencies** (`@ai-sdk/*`, `ai`, `better-sqlite3`,
  `drizzle-orm`, `marked`, `posthog-node`, `zod`, `cors`) duplicated from `api`, plus
  `depcheck` as a production dependency. Every `npx srcbook` user installs all of it.
- **No `files` field on `srcbook`**, so `.mts` sources and tsconfigs publish. `packages/api`
  gets this right.
- **`web`'s build writes across a package boundary** (`cp -R ./dist/. ../../srcbook/public`)
  with no dependency edge from `srcbook` to `@srcbook/web` to order it. `turbo start` cannot
  guarantee `public/` is populated.
- `docker-compose.yml` sets `HOST` and `SRCBOOK_INSTALL_DEPS`; neither is read by any code.
  `HOST` in particular reads as though it controls the bind address — it doesn't, which is
  part of why the server binds `0.0.0.0`.

### CI

Runs build, lint, format check, and test on Node 18 and 22. Gaps: `pnpm install` without
`--frozen-lockfile` (lockfile drift never caught), the `check-types` turbo task is defined
but never invoked by anything, and Node 18 is tested but never used to build or ship — it's
been EOL since April 2025. Two commits sit on `main` with no changeset, so no release has
been cut for the app-builder removal or the AI SDK bump.

### Frontend

Reviewed in less depth than the server, but the load-bearing issues:

- `use-cell.tsx` implements the cell store as four `useRef`s plus a `forceComponentRerender`,
  and rebuilds the context value every render. Every keystroke in any cell re-renders every
  cell, and `React.memo` below it can't help because the array identity is unstable.
- The refs exist explicitly to dodge stale closures around the websocket, which is treating
  the symptom. An external store with `useSyncExternalStore` is the shape this wants.
- `install-package-modal.tsx:71` transitions to `success` whenever loading finishes,
  regardless of outcome. `setMode('error')` is never called anywhere, so the error branch is
  dead code and a failed npm install reports "Successfully added <pkg>".
- Loader data and props are mutated in place by `.sort()` in four places.
- A 28-prop component (`components/cells/code.tsx`), with all 28 spelled out at the call site
  and 18 re-drilled one level deeper.

---

## 4. What I'd do first

In order, and roughly what the task files in `tasks/` reflect:

1. **Security hardening** (§1). Nothing else matters until a web page can't run code on the
   user's machine. Small, well-scoped, testable.
2. **Crash fixes** (§3), starting with `deps.mts` — it's on the cell-execution path.
3. **Tests for both of the above**, plus the pure modules that have none. This is how the
   restart avoids re-breaking things.
4. **Decide the execution model explicitly** (§2.1) and write it into `DECISIONS.md`. Much of
   what to build next depends on that answer.
5. **Session state ownership** (§2.3) before any multi-client work.
6. **Cleanup**: dead code, `.dockerignore`, unused deps, the `components` question.

The prototype is in better shape than its dormancy suggests. The architecture is coherent,
the format instinct is right, and the tsserver integration is the kind of thing that's hard
to get working at all. What it needs is a security pass, a safety net, and one explicit
decision about what kind of notebook it wants to be.
