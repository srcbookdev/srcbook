---
id: 0001
title: Lock down the network surface (bind, CORS, websocket origin)
status: TODO
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
