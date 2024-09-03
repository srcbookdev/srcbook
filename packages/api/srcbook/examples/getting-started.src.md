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

Srcbooks are an interactive way of programming in JavaScript or TypeScript. They are similar to other notebooks, but unique in their own ways.
They are based on the [node](https://nodejs.org/en) runtime.

A Srcbook is composed of **cells**. Currently, there are 2 types of cells:
 1. **markdown cell**: what you're reading is a markdown cell. It allows you to easily express ideas with rich markup, rather than code comments, an idea called [literate programming](https://en.wikipedia.org/wiki/Literate_programming).
 2. **code cell**: think of these as JS or TS files. You can run them or export objects to be used in other cells.

Srcbooks also hold dependencies in a package.json, and if they are TypeScript Srcbooks, they have a tsconfig.json. You can view these in the ⚙️ Settings menu on the left.

###### simple-code.js

```javascript
// You can run me by clicking 'Run' or using the shortcut `cmd` + `enter`.
console.log("Hello, Srcbook!")
```

## Using npm libraries

You can add any external node.js-compatible dependency from [npm](https://www.npmjs.com/). Let's look at an example below by importing the `random-words` library.

You'll need to make sure you install dependencies, which you can do by clicking the ⚙️ settings in the left menu.

You can install dependencies (think of this as running `npm install` for your Srcbook), by clicking the toast when prompted, or going in the settings and clicking "`npm install`".

###### generate-random-word.js

```javascript
import { generate } from 'random-words';

for (let i = 0; i < 4; i++) {
  console.log(`Word ${i + 1}: ${generate()}`);
}
```

## Importing other cells

Behind the scenes, cells are ECMAScript 6 modules. Therefore you can export variables from one cell and import them in another:

###### star-wars.js

```javascript
export const vaderLine = (name) => `I am your father, ${name}`
```

###### star-liner.js

```javascript
import { vaderLine } from './star-wars.js';

console.log(vaderLine("Luke"));
console.log(vaderLine("Leia"));
```

## Using secrets

For security purposes, you should avoid pasting secrets directly into Srcbook cells. The mechanism you should leverage is [secrets](/secrets). These are stored securely and are accessed at runtime as environment variables through `process.env`.

Secrets can then be imported in Srcbooks using `process.env.SECRET_NAME`. Try it out by setting the SECRET_API_KEY and getting it to print to the console below:

###### secret-message.js

```javascript
const secret = process.env.SECRET_API_KEY

console.log(secret ? `The secret is: ${secret}` : 'SECRET_API_KEY not set')
```

## Using AI

Srcbook has lots of productive AI features. We designed the AI to be a copilot, leaving you in the driver's seat while allowing you to iterate on code and markdown using natural language if you want to.

First, you'll have to configure a provider in the [global settings](./settings). You can select openAI or anthropic, and pass an API_KEY, or configure a local model through software like [Ollama](https://ollama.com/).

Once set up, you can:
 - generate entire Srcbooks from a prompt, like "I want to learn about CRDTs and Y.js" from the home page
 - create new cells using AI by giving it a description of what you want
 - edit a cell by prompting what changes you want. The AI will present you with a diff that you can approve or reject.

You can see the AI features in action in [this video](https://www.loom.com/share/a212e1fd49a04c548c09125a96a1836f?sid=7bc506ca-fdd1-44b9-b51e-5006ae4248f4).

Try it out by setting up an AI provider, and then click on the Sparkles icon to edit the cell below with AI and ask it to "fix the bug".

###### fix-me.js

```javascript
function factorial(n) {
  if (n === 0 || n === 1) {
    return 1;
  }
  return n * factorial(n - 2);
}

console.assert(factorial(5) === 120, 'Factorial of 5 should be 120');
```

## Exporting and sharing Srcbooks

Srcbooks are meant to be collaborative. They export to a Markdown file format with the `.src.md` extension, which can be rendered in any editor or UI that supports Markdown.

You can export Srcbooks by clicking the `Export` link in the top level menu on the left.

You can also import `.src.md` files directly in this application if you want to run, modify, or re-export them.

## The hub & feedback

We have created a [hub](./https://hub.srcbook.com) with some example Srcbooks that you can import really easily with one command. 

You can for example import a Srcbook teaching you how to programmatically take screenshots of websites using pupeteer by running:
```
npx srcbook@latest import web-scraping-with-puppeteer
```

If you want to add your Srcbook to the hub or give us feedback, just email us at feedback@srcbook.com, we love hearing from our users!

Enjoy Srcbook, time to build 🏗️!
