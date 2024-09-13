## Setup

- Node 18+
- pnpm 9.5+

Note: if you switch node versions during development, you may need to rebuild with `pnpm rebuild -r` due to the `better-sqlite3` native bindings.

## Development

First, make sure to install dependencies:

```
pnpm install
```

The app runs 2 separate servers:

- one vite server that hot-reloads and runs the web application
- one express server that runs the API and the websocket transport.

To run the app for local development, you can start both with a single command:

```shell
pnpm run dev
```

Then visit http://localhost:5173

_Note: make sure to run the database migrations with `pnpm run migrate` if you get a drizzle DB error._

## Running pnpm scripts

Similar to NPM, check top-level package.json for scripts.

```shell
pnpm run check-types
```

To run a script defined in one of the packages:

```shell
pnpm run check-types --filter=@srcbook/api
```

## Making a changeset

For creating release notes whenever a change is made

```shell
pnpm changeset
```

then follow through the CLI, provide clean descriptions to your changes

### Finalizing the version

The command below should clean up all files in `.changeset` into proper `CHANGELOG.md` files inside of their respective packages

```shell
pnpm changeset version
```

> Note these will also be used by the changeset action to create gh release notes in the future

## Adding a dependency

To add a dependency from npm registry:

```shell
# Add npm dependency to the API package
pnpm add <dep> --filter api

# Add npm dev dependency to the API package
pnpm add -D <dep> --filter api
```

To add a dependency from within the workspace:

```shell
# Add the shared package to the API package.
pnpm add @srcbook/shared --workspace --filter api

# Add the shared package as a dev dependency to the API package.
pnpm add -D @srcbook/shared --workspace --filter api
```

To remove a package, use `remove` instead of `add` in the commands above.

## Database

The application is powered by a local sqlite3 database, that lives at `~/.srcbook/srcbook.db`. We use [drizzle](https://orm.drizzle.team/) as an orm and for migrations.

To create a new migration, first modify [schema.ts](./packages/api/db/schema.mts), then run

```shell
# This will generate the migration
pnpm run generate -- --name <migration_name>
```

To apply migrations:

```shell
pnpm run migrate
```

## Releasing

The package that gets published to npm is under [srcbook/](./srcbook/). Publishing `srcbook` currently assumes that you've published the latest relevant versions for `@srcbook/shared` and `@srcbook/api`. Currently, you should do all of these manually, following this checklist:

From the root level:

- run `pnpm run build`

From the relevant package directory:

- update the CHANELOG.md in the root directory
- bump the version in the package.json, commit and push the changes. Example: `git commit -m "Release srcbook version 0.0.1-alpha.10`
- `pnpm publish`
- push git tags & add release notes to GitHub

TODO: automate this further with semantic commits, auto-changelogs and git tag pushing.
