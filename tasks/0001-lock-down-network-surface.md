---
id: 0001
title: Lock down the network surface (bind, CORS, websocket origin)
status: DONE
created: 2026-07-29
area: api
---

## Why

Confirmed against a running instance: the server binds `0.0.0.0`, every route sends
`Access-Control-Allow-Origin: *`, the websocket accepts any origin, and there is no auth.

Any web page the user visits can read their provider API keys from `GET /api/settings`, read
arbitrary files via `POST /api/file`, and — because the websocket accepts foreign origins —
push `cell:update` + `cell:exec` to run arbitrary code as the user.

See `REVIEW.md` §1 for the reproduction.

## Acceptance

- Server binds `127.0.0.1` by default; a `HOST` env var opts into wider binding
  (`docker-compose.yml` already sets `HOST`, which today is read by nothing)
- CORS replaced with an explicit localhost allowlist; cross-origin requests are rejected
- Websocket upgrade verifies `Origin` against the same allowlist
- The vite dev setup (`:5173` → `:2150`) still works
- Tests covering: allowed origin passes, foreign origin rejected, non-localhost bind requires
  explicit opt-in

## Notes

Keep the allowlist shared between the HTTP and websocket paths — one source of truth, or they
will drift.

Done in `server/security.mts`. Two things worth remembering:

**CORS headers alone are not a fix.** They stop an attacker _reading_ a response, but the
request still executes — which is all you need for `POST /api/settings`. Disallowed origins
have to be rejected outright, so there's a `verifyOrigin` middleware alongside the `cors`
middleware rather than just `cors` configured with an allowlist.

**Checking the origin in the websocket `connection` handler is too late.** `ws` has already
completed the handshake by then, so the client sees a socket open and only afterwards get
torn down. Verified this happening before switching to `verifyClient`, which runs before the
handshake — a rejected client now gets a 401 and never connects.

Requests with no `Origin` header are allowed on purpose: browsers always set it on
cross-origin requests, so its absence means a non-browser client (the CLI, curl), and
rejecting those would break `srcbook import`.

`HOST` was already set by `docker-compose.yml` and read by nothing. It's real now — but note
it has to be `0.0.0.0` _inside_ a container, because Docker forwards published ports to the
container IP. Host-side exposure is controlled by `HOST_BIND` on the ports line, which is the
knob that actually matters there.
