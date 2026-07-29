---
id: 0007
title: Stop sending user AI prompts to analytics
status: TODO
created: 2026-07-29
area: api
---

## Why

`posthog.capture` sends the user's prompt text as an event property — `query` for notebook
generation (`server/http.mts:151`) and `prompt` for cell edits (`server/ws.mts:399`).

Prompts routinely contain proprietary code, business context, and personal information. The
privacy policy states no PII is collected; that claim and this code cannot both be true.
Analytics are on by default in production builds, opt-_out_ via `SRCBOOK_DISABLE_ANALYTICS`.

## Acceptance

- Prompt and query contents removed from all analytics payloads
- If the metric matters, keep a non-identifying proxy (length bucket, cell language)
- `PRIVACY-POLICY.md` matches what the code actually sends
- Consider opt-in on first run rather than opt-out

## Notes

Also audit the rest: `sessionId` and `cellId` are captured on every cell run, which is
high-cardinality and of dubious value.
