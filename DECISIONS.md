# Design decisions

Why the system is the way it is. Append new entries at the bottom; don't rewrite history —
if a decision is reversed, add a new entry that supersedes it and mark the old one.

Format: **status** is `active`, `superseded by #N`, or `under review`.

---

## 1. A notebook is a real npm project on disk, not a document

**Status:** active

Each srcbook is a directory under `~/.srcbook/srcbooks/<randomid>/` containing a real
`package.json`, `tsconfig.json`, `node_modules/`, and one file per code cell under `src/`.
The `README.md` in that directory is the canonical source, written in the `.src.md` format
with cells linked to their files rather than inlined.

**Why:** it makes the notebook runnable and debuggable by ordinary tooling. `tsserver` gets a
genuine project to analyse, so hover/completions/diagnostics are real TypeScript answers
rather than an approximation. `npm install` means any package on the registry works with no
special support. The escape hatch is good: a user can `cd` into the directory and run the
code with plain `node`.

**What it costs:** a full `node_modules` per notebook (hundreds of MB across a few
notebooks), install latency before a notebook is usable, and two representations of the same
thing that must be kept in sync (the in-memory session and the files on disk).

---

## 2. Cells execute as fresh child processes, not in a persistent kernel

**Status:** active — but this is the single biggest fork in the design, see `REVIEW.md`

Running a cell spawns a new process: `node <file>` for JavaScript, the notebook's own
`node_modules/.bin/tsx <file>` for TypeScript. The process exits when the cell finishes.

**Why:** it's simple, it's honest, and it inherits Node's real module semantics. There is no
hidden interpreter state to explain, no "restart kernel" concept, and no divergence between
what the notebook does and what `node file.ts` would do. Cells share state the way normal
programs do — by importing each other.

**What it costs:** the thing most people mean by "notebook" — incremental REPL state — does
not exist. You cannot define a variable in one cell and use it in the next. Every run pays
process startup plus TypeScript transpile (~300ms-1s). This makes srcbook a _literate
program_ rather than a _scratchpad_, which is a legitimate choice but a different product
from Jupyter or Livebook, and it should be a deliberate, stated position rather than an
accident of implementation.

---

## 3. `.src.md` is markdown, and cell structure is encoded in heading levels

**Status:** active

A notebook serialises to markdown with an HTML-comment metadata header. `#` (h1) is the
title. `######` (h6) marks a filename, and the block immediately after it is that file's
contents. Everything else is prose.

**Why:** the file renders as a readable document in any markdown viewer, on GitHub, in an
editor preview. Diffs are legible. There is no custom parser to maintain for consumers — a
`.src.md` degrades gracefully into ordinary markdown. This is the format's main advantage
over `.ipynb`, which is JSON that renders as noise and diffs as garbage.

**What it costs:** the format is structurally ambiguous. An h6 in ordinary prose becomes a
filename marker. The grammar is defined by the decoder's behaviour rather than by a spec,
and the validation rules are thin (exactly one h1, at most one package.json, h6 must be
followed by code). See `REVIEW.md` for the specific fragilities.

---

## 4. Cell outputs are not persisted

**Status:** active

Execution output is streamed to connected clients over the websocket and then forgotten.
It is not written into `.src.md`, not stored in sqlite, and not held in the session.

**Why:** this is deliberate and correct. Persisting outputs is what makes `.ipynb` files
diff badly, bloat repositories, and leak secrets into version control. A `.src.md` describes
a computation; it does not memoise one.

**What it costs:** reloading the page loses all output, and a client that connects while a
cell is running sees only the tail. The gap is not the storage decision — it's that there is
no server-side ring buffer for the _current_ run, which would fix the reload/late-join
problem without touching the file format. Worth doing.

---

## 5. Notebook state lives in memory; sqlite holds only config and secrets

**Status:** under review

`sessions` is a module-level `Record<string, SessionType>` in `packages/api/session.mts`,
populated by scanning `~/.srcbook/srcbooks` at import time. sqlite (via drizzle) stores only
the config singleton, secrets, and secret↔session associations.

**Why:** the filesystem is already the database for notebooks — decision #1 means the
directory is the truth. Duplicating it into sqlite would create a second source of truth to
reconcile.

**What it costs:** boot cost is O(notebooks on disk) because every one is eagerly decoded.
More importantly, the store mixes mutation styles — some paths mutate `session.cells` in
place, others replace the whole object in the map — so any closure holding a session
reference silently diverges. The source comments admit this (`// TODO: Real state management
pls.`). See `REVIEW.md`; this needs a single owner for session state.

---

## 6. Cell IDs are generated at decode time and are not persisted

**Status:** under review

`decode()` calls `randomid()` for every cell it produces. IDs are stable for the lifetime of
a session in memory, but a fresh decode of the same file yields entirely new IDs.

**Why:** the format stays clean — no machine identifiers cluttering a human-readable
document.

**What it costs:** nothing can reference a cell durably across a reload. Comments, saved
outputs, per-cell metadata, deep links, and collaborative editing all need a stable handle.
Note that code cells _already_ have one — the filename — and it's what the tsserver
integration actually keys on. The tension is only real for markdown cells. Worth deciding
explicitly rather than leaving implicit.

---

## 7. The websocket protocol is a hand-rolled Phoenix-style channel layer

**Status:** active

Messages are 3-tuples `[topic, event, payload]`. Topics support `<param>` wildcards
(`session:<sessionId>`). Each event registers a zod schema, and payloads are validated on
receipt. There is exactly one channel in the app.

**Why:** the tuple wire format is compact and the topic/event split maps cleanly onto
"which notebook" and "what happened". Per-event zod schemas shared between client and server
via `@srcbook/shared` mean the protocol is typed end to end, which is genuinely nice and
catches real mistakes.

**What it costs:** about 270 lines of framework for one channel, and it reimplements things
a mature library gets right — the envelope itself isn't validated, handler rejections are
unhandled, and there is no request/response correlation, so every tsserver round-trip is a
broadcast that clients have to guess is theirs. See `REVIEW.md`.

---

## 8. Secrets are injected as environment variables into the cell process

**Status:** active

Secrets live in sqlite, are associated with sessions explicitly, and are merged into the
child process env at spawn. An `env.d.ts` is generated so `process.env.FOO` type-checks.

**Why:** environment variables are the idiom Node code already expects, so notebook code
needs no srcbook-specific API. Generating the type declaration is a genuinely nice touch —
it makes the secret discoverable through autocomplete.

**What it costs:** secrets are stored in plaintext, and cells inherit the _server's_ full
environment on top of the associated secrets, so a notebook sees every variable the server
was started with, not just the ones the user associated.

---

## 9. AI operates on the `.src.md` format itself

**Status:** active

Generation prompts serialise the notebook to inline `.src.md`, insert a placeholder cell to
mark the insertion point, and parse the model's reply back with the same decoder.

**Why:** one representation for humans, disk, and the model. No separate AI-facing schema to
keep in sync, and the model's output is validated by the same parser that validates
everything else.

**What it costs:** a malformed generation fails at the parser with a message aimed at the
document rather than the user, and there's no repair step. All calls are non-streaming, so
whole-notebook generation is a long blank wait. `finishReason !== 'stop'` only logs a
warning, so truncated output is silently accepted as if complete.

---

## 10. The app trusts its network position — and shouldn't

**Status:** under review — actively being fixed

There is no authentication, no CSRF protection, and no origin checking anywhere. Every HTTP
route is wrapped in bare `cors()` (which is `Access-Control-Allow-Origin: *`), the websocket
accepts any origin, and the server binds `0.0.0.0`.

**Why it ended up this way:** "it runs locally on your machine" was treated as a security
boundary. It isn't one. Localhost is reachable from every web page the user visits, and
`0.0.0.0` is reachable from every device on the network.

**What it costs:** verified against a running instance — any website the user visits can read
their API keys, read arbitrary files from disk, and execute arbitrary code. This is the
top-priority fix; see `REVIEW.md` §1 and `tasks/`.
