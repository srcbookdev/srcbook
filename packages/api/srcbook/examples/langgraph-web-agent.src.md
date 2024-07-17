<!-- srcbook:{"language":"typescript"} -->

# LangGraph web agent

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@langchain/community": "^0.2.12",
    "@langchain/core": "^0.2.8",
    "@langchain/langgraph": "^0.0.24",
    "@langchain/openai": "^0.1.3",
    "@types/node": "^20.14.7",
    "better-sqlite3": "^9.6.0",
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## LangGraph tutorial

Based on [this tutorial](https://langchain-ai.github.io/langgraphjs/reference/).

We're going to build an agent that can search the web using the [Tavily Search API](https://tavily.com/).

First, let's ensure we've setup the right env variables:

###### env-check.ts

```typescript
import assert from 'node:assert';

assert.ok(process.env.OPENAI_API_KEY, 'You need to set OPENAI_API_KEY');
assert.ok(process.env.TAVILY_API_KEY, 'You need to set TAVILY_API_KEY');
```

## Define the agent

Now, let's define the Agent with LangGraph.js

###### agent.ts

```typescript
import { HumanMessage } from '@langchain/core/messages';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { ChatOpenAI } from '@langchain/openai';
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph/checkpoint/sqlite';
// import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from '@langchain/langgraph/prebuilt';

// Define the state interface
interface AgentState {
  messages: HumanMessage[];
}

// We'll use a local sqlite DB for memory
export const DB_NAME = 'langgraph_memory.db';

// Define the graph state
const graphState: StateGraphArgs<AgentState>['channels'] = {
  messages: {
    value: (x: HumanMessage[], y: HumanMessage[]) => x.concat(y),
    default: () => [],
  },
};

// Define the tools for the agent to use
const tools = [new TavilySearchResults({ maxResults: 1 })];
const toolNode = new ToolNode<AgentState>(tools);

const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 }).bindTools(tools);

// Define the function that determines whether to continue or not
function shouldContinue(state: AgentState): 'tools' | typeof END {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.additional_kwargs.tool_calls) {
    return 'tools';
  }
  // Otherwise, we stop (reply to the user)
  return END;
}

// Define the function that calls the model
async function callModel(state: AgentState) {
  const messages = state.messages;
  const response = await model.invoke(messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph<AgentState>({ channels: graphState })
  .addNode('agent', callModel)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addEdge('tools', 'agent');

// Initialize memory to persist state between graph runs
export const memory = SqliteSaver.fromConnString(DB_NAME);
// const checkpointer = new MemorySaver();

// Finally, we compile it!
// This compiles it into a LangChain Runnable.
// Note that we're (optionally) passing the memory when compiling the graph
export const app = workflow.compile({ checkpointer: memory });
```

Now that we've built our app, let's invoke it to first get the weather in SF:

###### sf-weather.ts

```typescript
import { app } from './agent.ts';
import { HumanMessage } from '@langchain/core/messages';

// Reference a thread
const thread = { configurable: { thread_id: '42' } };

// Use the Runnable
const finalState = await app.invoke(
  { messages: [new HumanMessage('what is the weather in sf')] },
  thread,
);

console.log(finalState.messages[finalState.messages.length - 1].content);
```

Now when we pass the same `thread_id`, in this case `"42"`, the conversation context is retained via the saved state that we've set in a local sqliteDB (i.e. stored list of messages).

Also, in this next example, we demonstrate streaming output.

###### ny-weather.ts

```typescript
import { app } from './agent.ts';
import { HumanMessage } from '@langchain/core/messages';

const nextState = await app.invoke(
  { messages: [new HumanMessage('what about ny')] },
  { configurable: { thread_id: '42' } },
);

console.log(nextState.messages[nextState.messages.length - 1].content);
```

## Clear memory

The memory was saved in the sqlite db `./langGraph.db`. If you want to clear it, run the following cell

###### clear.ts

```typescript
import { DB_NAME } from './agent.ts';
import fs from 'node:fs';
// I can't find good documentation on the memory module, so let's apply the nuclear method

fs.rmSync(DB_NAME);
```
