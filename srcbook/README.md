![Srcbook banner light](https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/064ebb1f-5153-4581-badd-42b42272fc00/public)

<p align="center">
  <a href="https://badge.fury.io/js/srcbook"><img src="https://badge.fury.io/js/srcbook.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="Apache 2.0 license" /></a>
</p>

<p align="center">
  <a href="https://hub.srcbook.com">Examples</a> ·
  <a href="https://discord.gg/shDEGBSe2d">Discord</a> ·
  <a href="https://www.youtube.com/@srcbook">Youtube</a>
</p>

## Srcbook

Srcbook is a TypeScript-centric app development platform. It allows you to create and iterate on web apps incredibly fast using AI as a pair-programmer.
It can create or edit web apps, and also write and execute backend code through an interactive notebook interface.


Srcbook is open-source (apache2) and runs locally on your machine. You need to bring your own API key for AI usage (we strongly recommend Anthropic with `claude-3-5-sonnet-latest`).

## Features

### App Builder

- AI app builder for TypeScript
- Create, edit and run web apps
- Use AI to generate the boilerplate, modify the code, and fix things
- Edit the app with a hot-reloading web preview

![example app builder app light](https://i.imgur.com/k4xAyCQ.png)

### Notebooks

- Create, run, and share TypeScript notebooks
- Export to valid markdown format (.src.md)
- AI features for exploring and iterating on ideas
- Diagraming with [mermaid](https://mermaid.js.org) for rich annotations
- Local execution with a web interface
- Powered by Node.js

![example notebook light](https://imagedelivery.net/oEu9i3VEvGGhcGGAYXSBLQ/ebfa2bfe-f805-4398-a348-0f48d4f93400/public)


## FAQ

See [FAQ](https://github.com/srcbookdev/srcbook/blob/main/FAQ.md).

## Getting Started

Srcbook runs locally on your machine as a CLI application with a web interface.

### Requirements

- Node.js v18+
- We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage local node versions

### Installing

We recommend using npx to always run the latest version from npm

```bash
# Using npm
npx srcbook@latest start

# Using your pm equivalent
pnpm dlx srcbook@latest start
```

> You can instead use a global install with `<pkg manager> i -g srcbook`
> and then directly call srcbook with `srcbook start`

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

### Uninstalling

You can remove srcbook by first removing the package, and then cleaning it's local directory on disk:

```bash
rm -rf ~/.srcbook

# if you configured a global install
npm uninstall -g srcbook
```

> if you used another pm you will need to use it's specific uninstall command

## Analytics and tracking

In order to improve Srcbook, we collect some behavioral analytics. We don't collect any Personal Identifiable Information (PII), our goals are simply to improve the application. The code is open source so you don't have to trust us, you can verify! You can find more information in our [privacy policy](https://github.com/srcbookdev/srcbook/blob/main/PRIVACY-POLICY.md).

If you want to disable tracking, you can run Srcbook with `SRCBOOK_DISABLE_ANALYTICS=true` set in the environment.

## Contributing

For development instructions, see [CONTRIBUTING.md](https://github.com/srcbookdev/srcbook/blob/main/CONTRIBUTING.md).
