You can contribute to Srcbook in three primary ways:

1. Using Srcbook! Usage leads to filing issues for bugs or feature requests.
2. Contributing code for fixes or features.
3. Being a Srcbook advocate.

Being an advocate is highly underrated. It helps the project grow and receive more investment. The best way to do this is use Srcbook, share your Srcbooks with others, write about or present using Srcbook, etc.

If you write interesting Srcbooks, share them with us and we will happily feature them on [the hub](https://hub.srcbook.com)!

## Code contributions

> [!TIP]
> Before spending time writing code, consider opening an issue and clarifying desired behavior with the maintainers to ensure a smooth process. We are quick to respond!

If you're ready to file a PR, remember to [add a changeset](#making-a-changeset).

### Setup

- Node 18+
- pnpm 9.5+

Note: if you switch node versions during development, you may need to rebuild with `pnpm rebuild -r` due to the `better-sqlite3` native bindings.

### Development

First, make sure to install dependencies:

```shell
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

### Running pnpm scripts

Similar to NPM, check top-level package.json for scripts.

```shell
pnpm run check-types
```

To run a script defined in one of the packages:

```shell
pnpm run check-types --filter=@srcbook/api
```

### Making a changeset

When you create a PR, we ask that you also create a changeset. This is part of our release process automation.

```shell
pnpm changeset
```

This will prompt you about what has changed and whether it should be considered major/minor/patch.

> [!IMPORTANT]  
> Given the project is young, we are keeping all changes as minor or patch. Using patch is the safest bet for now.

Please write good changeset messages because these will appear in our changelogs.

### Adding a dependency

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

### Database

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
