---
id: 0005
title: Fix process registry clobbering on double-exec
status: TODO
created: 2026-07-29
area: api
---

## Why

`Processes` keys running children on `sessionId:cellId` (`processes.mts:44`). Executing the
same cell twice before the first exits overwrites the map entry — and then the _first_
process's `exit` handler deletes the key now owned by the _second_:

```js
this.processes[key] = process;
process.on('exit', () => {
  delete this.processes[key];
});
```

Result: an orphaned process nobody can kill, while `cell:stop` reports "no process for
session … exists" even though something is very much running.

Related, same area: `SIGTERM` goes to the `tsx` wrapper rather than the process group, so
grandchildren can survive a stop. Worth verifying whether `tsx` forks a child node process —
if it does, stop is only cosmetic for TypeScript cells.

## Acceptance

- Exit handler only deletes the entry if it still owns it (compare the process reference)
- Starting a cell that is already running either kills the old process first or is rejected —
  pick one and make it explicit
- Test covering the double-exec sequence
- Verified answer on whether stop actually kills TypeScript cell processes

## Notes

Guarding the delete is a two-line fix. The "what should double-exec even do" question is the
real decision — the UI currently disables run while running, so this is reachable mainly via
a second client or a race, which makes it exactly the kind of bug that shows up once and is
never reproduced.
