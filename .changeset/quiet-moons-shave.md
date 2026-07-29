---
'@srcbook/api': minor
'srcbook': minor
---

Reject requests and websocket connections from non-local origins, and bind to loopback by
default.

Srcbook has no authentication and executes code, so any web page the user visited could
previously read their provider API keys, read files off disk, and run arbitrary code through
the websocket. The server also listened on every network interface.

Requests now need a local `Origin` (any port), or one listed in the new
`SRCBOOK_ALLOWED_ORIGINS` environment variable. Requests without an `Origin` header — the CLI,
curl, same-origin navigations — are unaffected.

To reach Srcbook from another machine, set `HOST` explicitly (for example `HOST=0.0.0.0`) and
add the origin you'll browse from to `SRCBOOK_ALLOWED_ORIGINS`. Only do this on a network you
trust.
