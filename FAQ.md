# FAQ

### How is Srcbook different from Observable?

[Observable](https://observablehq.com) states:

> Observable is the modern platform for developing and hosting powerful, performant, polyglot data apps

Observable is intended for visualizing data (plotting, charts, graphs, etc.) and serving those visualizations as static sites. Our understanding of the use cases they're targeting is that of data journalism, research, reports, and business analytics. You can see how they view themselves on their [explore](https://observablehq.com/explore) and [about](https://observablehq.com/about) pages.

Srcbook is intended to be a development aid and learning resource for every day software development. We use Srcbook to learn concepts, explore libraries on npm, flesh out ideas in code, test code or HTTP endpoints (like a scripting version of Postman), and more. Srcbook's AI features can write entire Srcbooks for you, or edit existing ones. Since Srcbook is an execution environment in addition to a coding one, you can immediately excecute code that AI writes. If you opt-in to the AI features, this means Srcbook can serve as a superior AI playground because it can _execute your code_ in addition to writing it, speeding up development cycles. Note that code is not executed without your explicit consent.

We have an early version of [a Hub](https://hub.srcbook.com) where we'll be publishing interesting Srcbooks as learning or R&D resources. Soon anyone can publish there, which may open up more use cases like publishing interactive/executable documentation along with your npm package.

Technical differences include:

- Srcbook currently runs your code in a Node.js process. Thus, it is more for backend code or code shared across the frontend and backend. Our understanding is that observable runs your code in the browser and is therefore limited to what you can do in the browser. For Srcbook, this means that you can open database connections, spawn web servers, work directly with the file system, etc.
- Observable publishes static sites (dashboards). We believe notebook-like products have more potential. We want Srcbook to be dynamic (hence Node.js) so that we eventually have the capability of turning your Srcbook into a full-fledged application, similar to [Livebook's apps](https://news.livebook.dev/deploy-notebooks-as-apps-quality-of-life-upgrades---launch-week-1---day-1-2OTEWI) or possibly products like [Streamlit](https://streamlit.io/). This would make Srcbook a great option for internal tools and more.

This is our current understanding of the differences. Please reach out if something here is inaccurate.

### Can I write React Components or other UI logic in Srcbook?

Currently, Srcbook runs all code inside of a Node.js process. Since your code is not running in the browser, you are not able to render UI components or 'hack' the Srcbook UI.

That said, we believe the ability to rapidly iterate on both FE and BE code is immensely valuable. We are in the early stages of designing feature(s) that allow you to write custom FE components in Srcbook that can also interact with the backend Node.js processes. This will unlock the ability to build entire applications inside Srcbook.

If you are opinionated here or otherwise interested in contributing, please file an issue, open a discussion, or submit a PR. We love community involvement!
