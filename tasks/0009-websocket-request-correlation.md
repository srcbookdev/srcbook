---
id: 0009
title: Add request/response correlation and reconnect resubscribe to the websocket
status: TODO
created: 2026-07-29
area: shared
---

## Why

Two structural gaps in the websocket layer, both producing bugs that look like flakiness.

**No request/response correlation.** tsserver replies (`quickinfo`, `completions`,
`definition`) are broadcasts carrying neither a `cellId` nor a request id
(`packages/shared/src/schemas/websockets.mts:115-130`). The client registers a global listener
and assumes the next response is its own. Two cells requesting completions concurrently
resolve each other's promises; hovering in one cell can fill another's tooltip. A `ref` field
on the envelope fixes the entire class.

Related: `get-completions.ts:27` returns early when the response is `null` without ever
resolving, so CodeMirror's autocomplete promise hangs forever whenever tsserver returns null.

**Subscriptions don't survive reconnect.** The client reconnects with backoff and flushes its
queue but never re-sends `subscribe`; `Channel.subscribed` stays `true`, so it never
re-handshakes. Server-side subscriptions are per-connection and die with the socket. After any
reconnect the client still sends but receives nothing — run a cell after a server restart and
the UI hangs on "running" forever.

## Acceptance

- Envelope carries an optional `ref`; request-shaped events echo it in the response
- tsserver client helpers resolve/reject their own request only
- `null` responses settle their promise
- Reconnect re-subscribes every channel; test covers it
- Test: two concurrent completion requests get their own answers

## Notes

The reconnect bug is the more user-visible of the two and the cheaper fix — reset
`subscribed` on close and re-run the handshake on open. Do that first.
