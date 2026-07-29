---
id: 0006
title: Decide the execution model explicitly
status: TODO
created: 2026-07-29
area: docs
---

## Why

Cells run as fresh child processes, so there is no shared state between them — you cannot bind
a value in one cell and use it in the next. That's a legitimate, defensible design (see
`DECISIONS.md` #2), but right now it reads as an implementation detail rather than a stance,
and a lot of downstream work depends on which way this goes.

The three coherent positions, expanded in `REVIEW.md` §2.1:

1. **Stay stateless and lean in** — "literate program, not scratchpad". Invest in fast reruns,
   reproducible run-all, watch mode. Needs a warm process pool to fix latency.
2. **Add an opt-in kernel** — long-lived worker per notebook evaluating into a shared context.
   Unlocks data exploration; costs you "restart kernel" and out-of-order-execution confusion.
3. **Hybrid** — toggle per notebook. Looks like a compromise, actually the most expensive
   option, because every feature gets designed twice.

## Acceptance

- A decision, written into `DECISIONS.md` as an entry that supersedes #2
- If (1): a follow-up task for the warm-process pool
- If (2) or (3): a design sketch for kernel lifecycle before any code

## Notes

My read is (1). The differentiator against Jupyter isn't "notebook for TypeScript" — it's the
runnable, reviewable, diffable document. Chasing kernel state trades that advantage for a
fight on Jupyter's turf. But it's your call, and it's the highest-leverage open question in
the project.

Independent of the answer: there are no execution timeouts, no output caps, and no memory
limits. `while(true) console.log('x')` streams unbounded output over the websocket until the
browser dies. That needs fixing either way.
