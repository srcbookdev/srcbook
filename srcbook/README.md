![Srcbook banner light](https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/733eaa72-3f6a-47f4-2560-9b9441d5ce00/public)

<p align="center">
  <a href="https://badge.fury.io/js/srcbook"><img src="https://badge.fury.io/js/srcbook.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="Apache 2.0 license" /></a>
</p>

<p align="center">
  <a href="https://hub.srcbook.com">Examples</a> ·
  <a href="https://discord.gg/shDEGBSe2d">Discord</a> ·
  <a href="https://www.youtube.com/@srcbook">Youtube</a>
</p>

## Features

- Create, run, and share reproducible programs and ideas
- Export to valid markdown format (.src.md)
- AI features for exploring and iterating on ideas
- Local execution with a web interface
- Powered by Node.js
- Open-source under the Apache2 license

![Example Srcbook light](https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/08f1a7b9-2fc1-404c-6621-9f0280010600/public)

## FAQ

See [FAQ](https://github.com/srcbookdev/srcbook/blob/main/FAQ.md).

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

In order to improve Srcbook, we collect some behavioral analytics. We don't collect any Personal Identifiable Information (PII), our goals are simply to improve the application. The code is open source so you don't have to trust us, you can verify! You can find more information in our [privacy policy](https://github.com/srcbookdev/srcbook/blob/main/PRIVACY-POLICY.md).

If you want to disable tracking, you can run Srcbook with `SRCBOOK_DISABLE_ANALYTICS=true` set in the environment.

## Contributing

For development instructions, see [CONTRIBUTING.md](https://github.com/srcbookdev/srcbook/blob/main/CONTRIBUTING.md).
