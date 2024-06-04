# Srcbook

Interactive notebooks for JavaScript.

## Repo architecture

The repository is split between client code (found at the root level) and server code, found under [/server](/server).

## Development

First, run the server:

```
$ cd server/
$ npm i
$ npm run dev
```

Then, run the client:

```
$ # from root of repository
$ npm i
$ npm run dev
```

You can pass the following env variables:

- `SRC_BOOK_CONFIG_DIR`: this is the directory where the local config.json will live

## Config

Configuration can be modified in the application UI directly, and is present at `$SRC_BOOK_CONFIG_DIR/config.json`
