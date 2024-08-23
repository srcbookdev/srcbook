# Srcbook

[![npm version](https://badge.fury.io/js/srcbook.svg)](https://badge.fury.io/js/srcbook)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

TypeScript & JavaScript notebooks.

## Features

- Create, run, and share reproducible programs and ideas
- Export to valid markdown format (.src.md)
- AI features for exploring and iterating on ideas
- Local execution with a web interface
- Powered by Node.js
- Open-source under the Apache2 license

![the getting started srcbook](./assets/getting-started-srcbook.png)

## Getting Started

Srcbook runs locally on your machine as a CLI application with a web interface.

### Requirements

- Node.js v18+
- We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage local node versions

### Installing

You can install the `srcbook` application from `npm`:

```bash
npm install -g srcbook
```

### Running

```
srcbook start
```

You can also run it directly using `npx`:

```bash
# Using npx
npx srcbook start

# Using pnpm
pnpm dlx srcbook start
```

Here is the current list of commands:

```bash
$ srcbook -h
Usage: srcbook [options] [command]

Srcbook is a interactive programming environment for TypeScript

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  start [options]               Start the Srcbook server
  import [options] <specifier>  Import a Srcbook
  help [command]                display help for command
```

### Updating

You can update `srcbook` using `npm`:

```bash
npm update -g srcbook
```

### Uninstalling

You can remove srcbook by first removing the package, and then cleaning it's local directory on disk:

```bash
npm uninstall -g srcbook
rm -rf ~/.srcbook
```

## Analytics and tracking

In order to improve Srcbook, we collect some behavioral analytics. We don't collect any Personal Identifiable Information (PII), our goals are simply to improve the application. The code is open source so you don't have to trust us, you can verify! You can find more information in our [privacy policy](./PRIVACY-POLICY.md).

If you want to disable tracking, you can run Srcbook with `SRCBOOK_DISABLE_ANALYTICS=true` set in the environment.

## Development

For development instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).
