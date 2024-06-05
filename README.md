# Srcbook

Interactive notebooks for JavaScript.

## Setup

- Node 22+
- pnpm 9+

## Development

To run the app, you'll need to start both the API and Web servers.

Run the API:

```shell
pnpm run dev-api
```

Run the Web server:

```shell
pnpm run dev-web
```

Then visit http://localhost:5173

## Running pnpm scripts

Same as NPM, check top-level package.json for scripts.

```shell
pnpm run lint-web
```

To run a script defined in one of the packages:

```shell
pnpm --filter api typecheck
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

## Env

You can pass the following env variables:

- `SRC_BOOK_CONFIG_DIR`: this is the directory where the local config.json will live

## Config

Configuration can be modified in the application UI directly, and is present at `$SRC_BOOK_CONFIG_DIR/config.json`
