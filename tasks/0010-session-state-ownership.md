---
id: 0010
title: Give session state a single owner
status: TODO
created: 2026-07-29
area: api
---

## Why

`packages/api/session.mts` mixes two update styles. `updateCellWithRollback` mutates
`session.cells` on the existing object; `updateSession` replaces the object in the map
(`sessions[id] = {...session, ...updates}`). Meanwhile every exec callback closes over the
session reference it captured at spawn time.

The concrete bug: delete a cell while it is running. The exit handler looks the cell up in its
_stale_ `session.cells`, finds it, sets `status: 'idle'`, and broadcasts — so the client
resurrects a deleted cell. The same lookup is cast with `as CodeCellType` and immediately
dereferenced (`ws.mts:180`, `:214`), so a miss is a `TypeError` rather than a no-op.

The code knows: `// TODO: Real state management pls.`

## Acceptance

- One module owns session mutation; nothing else writes to `sessions`
- Handlers re-read by id at the point of use rather than closing over the object
- Pick mutable or immutable and apply it consistently
- Test: delete a cell mid-run, assert no resurrect and no throw

## Notes

This is the foundation any multi-client or collaboration work would sit on, so it should land
before that rather than after. Also relevant to task 0006 — if execution ever becomes
stateful, the session store is where that state would live.
