# Tasks

A file-based task tracker. One markdown file per task, no tooling, no database.
Plain files so they diff, review, and grep like everything else in the repo.

## Conventions

Filename: `NNNN-short-slug.md`, zero-padded, monotonically increasing.

Every task starts with YAML frontmatter:

```yaml
---
id: 0001
title: Short imperative title
status: TODO # TODO | IN_PROGRESS | DONE
created: 2026-07-29
area: api # api | web | shared | cli | ci | docs | format
---
```

Then free-form markdown. Useful sections, in rough order of value:

- **Why** — what breaks, or what's worse, without this
- **Acceptance** — how we know it's done
- **Notes** — findings, decisions made along the way, links to PRs

## Lifecycle

`TODO` → `IN_PROGRESS` → `DONE`. Edit the `status` field in place; don't move or rename the
file. A task's history then lives in git where it belongs, and `id` stays a stable reference.

Prefer small tasks. If a task can't be described in a paragraph, it's probably two tasks.

When a task turns up something worth remembering — a design decision, a reason, a constraint
that wasn't obvious — write it into `DECISIONS.md` rather than leaving it in the task file.
Tasks are ephemeral; decisions aren't.

## Listing

```bash
grep -h -e '^id:' -e '^title:' -e '^status:' tasks/*.md | paste - - -
```

Just the open ones:

```bash
grep -l 'status: TODO' tasks/*.md
```
