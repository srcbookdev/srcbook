# Contributing

🚀 First off, thanks for taking the time to read this guide! We appreciate your interest in contributing to srcbook. 🎉👍

The following is a set of guidelines for contributing to srcbook which is hosted by srcbookdev on GitHub. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## How can I contribute?

### Reporting Bugs

Let's be honest, bug happens everytime and the more you describe it, the more srcbook contributors can help you. When you are creating a bug report, please include as many details as possible. Fill out the required template, the information it asks for helps us resolve issues faster.

### Make Something

#### Project Setup

Here we are, you wanna contribute some code! That's awesome!

If you are not familiar with [Github Pull Request & Fork](https://docs.github.com/fr/get-started/exploring-projects-on-github/contributing-to-a-project), you can read a bit more about it by following the link.

`srcbook` project requires:
- [Node 22+](https://nodejs.org/fr/blog/release/v22.0.0) (preferably using [nvm](https://github.com/nvm-sh/nvm))
- [pnpm 9+](https://pnpm.io/fr/)

##### Install dependencies

> *Optional* nvm commands:
> ```bash
> # Install node v20 with NVM
> nvm i v20
> # Use it for current shell session
> nvm use v20
> ```

Then boostrap the pnpm project by running:

```bash
# Install project dependencies
pnpm i
pnpm build
```

##### Development

In development, the app runs 2 separate servers, one vite server that hot-reloads and runs the web application, and one express server that runs the API and the websocket transport.

To run the app for local development, you'll need to start both:
To run the application for local development, you'll need to start both the API and the Web Server in separated terminal.

- Run the API:

```shell
pnpm run dev-api
```

Run the Web server:

```shell
pnpm run dev-web
```

Then visit http://localhost:5173

_Note: make sure to run the database migrations with `pnpm run migrate` prior to running the api server_

##### Running pnpm scripts

Similar to NPM, check top-level package.json for scripts.

```shell
pnpm check-types
```

To run a script defined in one of the packages:

```shell
pnpm --filter api check-types
```

##### Adding a dependency

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

##### Database

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

#### Releasing

The package that gets published to npm is under [srcbook/](./srcbook). Publishing checklist:

- run `pnpm run build`
- bump the version in the [srcbook/package.json](./srcbook/package.json)
- Don't forget to first publish sub packages (e.g., `shared`) if they've been modified
- `cd srcbook/ && pnpm publish`
- push git tags & add release notes to GitHub
