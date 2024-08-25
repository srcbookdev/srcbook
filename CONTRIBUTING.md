## Setup

- Node 22+
- pnpm 9+

## Development

In development, the app runs 2 separate servers, one vite server that hot-reloads and runs the web application, and one express server that runs the API and the websocket transport.

To run the app for local development, you'll need to start both:

Run the API:

```shell
turbo dev
```

Then visit http://localhost:5173

_Note: make sure to run the database migrations with `pnpm run migrate` prior to running the api server_

## Running pnpm scripts

Similar to NPM, check top-level package.json for scripts.

```shell
turbo check-types
```

To run a script defined in one of the packages:

```shell
turbo check-types --filter=@srcbook/api
```

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

The package that gets published to npm is under [srcbook/](./srcbook/). Publishing checklist:

- run `pnpm run build`
- bump the version in the [srcbook/package.json](./srcbook/package.json)
- Don't forget to first publish sub packages (e.g., `shared`) if they've been modified
- `cd srcbook/ && pnpm publish`
- push git tags & add release notes to GitHub
