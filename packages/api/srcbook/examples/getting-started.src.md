<!-- srcbook:{"language":"javascript"} -->

# Getting started

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "random-words": "^2.0.1"
  }
}
```

## What are Srcbooks?

Srcbooks are an interactive way of programming in JavaScript or TypeScript. They are similar to other notebooks like python's [jupyter notebooks](https://jupyter.org/), but unique in their own ways.
They are based on the [node](https://nodejs.org/en) runtime.

A Srcbook is composed of **cells**. Currently, there are 4 types of cells:
 1. **Title cell**: this is "Getting started" above. There is one per Srcbook.
 2. **package.json cell**: this is a special cell that manages dependencies for the Srcbook.
 3. **markdown cell**: what you're reading is a markdown cell. It allows you to easily express ideas with rich markup, rather than code comments, an idea called [literate programming](https://en.wikipedia.org/wiki/Literate_programming).
 4. **code cell**: think of these as JS or TS files. You can run them or export objects to be used in other cells.

###### simple-code.js

```javascript
// This is a trivial code cell. You can run me by
// clicking 'Run' or using the shortcut `cmd` + `enter`.
console.log("Hello, Srcbook!")
```

## Dependencies

You can add any external node.js-compatible dependency from [npm](https://www.npmjs.com/). Let's look at an example below by importing the `random-words` library.

You'll need to make sure you install dependencies, which you can do by running the `package.json` cell above.

###### generate-random-word.js

```javascript
import {generate} from 'random-words';

console.log(generate())
```

## Importing other cells

Behind the scenes, cells are files of JavaScript or TypeScript code. They are ECMAScript 6 modules. Therefore you can export variables from one file and import them in another.

###### star-wars.js

```javascript
export const func = (name) => `I am your father, ${name}`
```

###### logger.js

```javascript
import {func} from './star-wars.js';

console.log(func("Luke"));
```

## Using secrets

For security purposes, you should avoid pasting secrets directly into Srcbooks. The mechanism you should leverage is [secrets](/secrets). These are stored securely and are accessed at runtime as environment variables.

Secrets can then be imported in Srcbooks using `process.env.SECRET_NAME`:
```
const API_KEY = process.env.SECRET_API_KEY;
const token = auth(API_KEY);
```

## Exporting and sharing Srcbooks

Srcbooks are meant to be collaborative. They export to a Markdown file with the `.src.md` extension, which can be rendered in any editor or UI that supports Markdown.

You can export Srcbooks by clicking the `Export` link in the top level menu on the left.

You can also import `.src.md` files directly in this application if you want to run, modify, or re-export them.
