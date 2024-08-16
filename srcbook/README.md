# Srcbook

Srcbooks are interactive notebooks for JavaScript & TypeScript. They allow you to create, run and share reproduceable programs and ideas, and they export to a valid markdown format. It has AI features which make it very productive to explore and iterate on ideas.

Srcbook runs locally on your machine and is fully open-source under the Apache2 license.

Srcbook is served as a CLI application that you can install through npm. Once installed, it provides a web interface running locally. You can use this interface to create, export or import Srcbooks.

Srcbooks export to markdown using the `.src.md` extension. These files can easily be shared, versioned, and rendered in any environment that supports Markdown, like your editor or GitHub UI.

To learn more, try out the interactive tutorial which is itself a Srcbook by clicking "Getting Started" when launching the application.

#### ⚠️ Warning

Srcbook is currently in alpha which means there may be breaking changes until it's out of alpha.

If you upgrade and are having trouble launching the application, you can `rm -rf ~/.srcbook` to clear the Srcbook directory and start from a clean state. This will, however, delete all your Srcbooks so you may want to first export any you care about to a `.src.md` file.

![the getting started srcbook](./assets/getting-started-srcbook.png)

## Requirements

Srcbook requires node v20+. We highly recommend using [nvm](https://github.com/nvm-sh/nvm) to manage local node versions.

## Installing

You can install the `srcbook` application from `npm`:

```bash
npm install -g srcbook
```

## Running

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

## Updating

You can update `srcbook` using `npm`:

```bash
npm update -g srcbook
```

## Uninstalling

You can remove srcbook by first removing the package, and then cleaning it's local directory on disk:

```bash
npm uninstall -g srcbook
rm -rf ~/.srcbook
```

## Analytics and tracking

In order to improve Srcbook, we collect some behavioral analytics. We don't collect anything personal or identifiable, our goals are simply to improve the application. The code is open source so you don't have to trust us, you can verify! You can find more information in our [privacy policy](./PRIVACY-POLICY.md).

If you want to disable tracking, you can do so in the settings page of the application.
