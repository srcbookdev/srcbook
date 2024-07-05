# Srcbook

Srcbooks are interactive notebooks for JavaScript & TypeScript. They allow you to create, run and share reproduceable programs and ideas.

Srcbook runs locally on your machine and is fully open-source under the Apache2 license.

Under the hood, Srcbook creates folders on your local machine and provides a web interface (also running locally) as a programming environment.

Srcbooks export to a `.srcmd` format, a superset of markdown. You can easily export Srcbooks into this format from the application, as well as import them. Given that they are a form of markdown, they are very git-friendly.

To learn more, try out the interactive tutorial which is itself a Srcbook by clicking "Getting Started" when launching the application.

![the getting started srcbook](./assets/getting-started-srcbook.png)

## Requirements

Srcbook requires node v22+. We highly recommend using [nvm](https://github.com/nvm-sh/nvm) to manage local node versions.

## Install

You can install the `srcbook` application from `npm`:

```
npm install -g srcbook
```

And then run it:

```
srcbook
```

You can also run it directly using `npx`:

```
# Using npx
npx srcbook

# Using pnpm
pnpm dlx srcbook
```

## Development

For development instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).
