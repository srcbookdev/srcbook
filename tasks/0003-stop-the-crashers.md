---
id: 0003
title: Stop the process crashers
status: DONE
created: 2026-07-29
area: api
---

## Why

Several paths take the whole server down on a single bad input. The server holds unsaved user
work, so a crash is worse than its individual severity suggests.

1. **`deps.mts:64` throws inside an `exec` callback** — not the promise executor, so the
   caller's `try/catch` can't catch it and the promise never settles. Any depcheck output
   without a `{...}` match kills the process. This runs on _every cell execution_.
2. **Unhandled websocket handler rejections** — `ws-client.mts:250` calls `handler(...)` with
   no `await`/`.catch()`; every handler is async and throws freely (`findSession` throws on
   unknown ids). A stale session id from a reconnecting client is enough.
3. **Unvalidated envelope** — `ws-client.mts:204` does `JSON.parse` in a sync listener. One
   malformed frame ends the process. (Per-event payloads are safely parsed; the envelope isn't.)
4. **`process.send` called unguarded** — `srcbook/src/server.mts:59`, behind a `@ts-ignore`. It
   only exists under IPC, so running the server directly crashes it _after_ printing
   "running at http://localhost:2150". Confirmed by running it.
5. **tsserver stdout parse errors are fatal** — `parse()` throws inside a `'data'` listener.

## Acceptance

- Each of the five paths logs and degrades instead of exiting
- Tests: malformed websocket frame doesn't kill the server; depcheck garbage output resolves
  to an empty list; server starts standalone without IPC

## Notes

Worth adding a top-level `unhandledRejection` handler as a backstop — but as a safety net
that logs loudly, not as the fix. Not added: with the handler-level catch in place there is
no known path to one, and a blanket handler would hide the next one instead of surfacing it.

All five fixed. (1) and (4) landed earlier in the stack — the depcheck throw in the injection
PR, since that function was being rewritten to use `execFile` anyway, and `process.send` in
the network PR, because that's how it was discovered.

The shape shared by (2), (3) and (5) is worth naming: **a throw inside an event-emitter
callback is an uncaught exception, not a failed operation.** `handleIncomingMessage` runs in a
socket `'message'` listener, `parse()` runs in a `'data'` listener, and the depcheck callback
runs in an `exec` callback. In all three the surrounding `try/catch` or promise looked like it
covered the code, and didn't.

Also fixed while here, from task 0005 and adjacent: tsserver request promises never settled if
the server died or never replied. They now time out at 10s and reject on process exit, so
`this.pending` can't leak.

The tsserver timeout is 10s because these are interactive requests — hover, completions,
go-to-definition. An answer that late is no more useful than no answer; what matters is that
the promise settles at all.

Still open, deliberately: a rejected tsserver request leaves the _client_ hanging, because
responses are broadcasts with no request correlation. That's task 0009.
