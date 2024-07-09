import Path from 'node:path';
import { DIST_DIR, SRCBOOKS_DIR } from '../constants.mjs';

// TODO: Put this in a migration and move to sqlite?

///////////////////////////////////////////////////////////
// Hardcoded ids so that we can easily track directories //
///////////////////////////////////////////////////////////

const GETTING_STARTED_SRCBOOK = {
  id: '30v2av4eee17m59dg2c29758to',
  path: Path.join(DIST_DIR, 'srcbook', 'examples', 'getting-started.srcmd'),
  title: 'Getting started',
  description: 'Quick tutorial to explore the basic concepts in Srcbooks.',
  get dirname() {
    return Path.join(SRCBOOKS_DIR, this.id);
  },
};

const LANGGRAPH_AGENT_SRCBOOK = {
  id: 'i72jjpkqepmg5olneffvk7hgto',
  path: Path.join(DIST_DIR, 'srcbook', 'examples', 'langgraph-web-agent.srcmd'),
  title: 'LangGraph agent',
  description: 'Learn to write a stateful agent with memory using LangGraph and Tavily.',
  get dirname() {
    return Path.join(SRCBOOKS_DIR, this.id);
  },
};

const INTRO_TO_WEBSOCKETS_SRCBOOK = {
  id: 'vnovpn5dbrthpdllvoeqahufc4',
  path: Path.join(DIST_DIR, 'srcbook', 'examples', 'websockets.srcmd'),
  title: 'Intro to WebSockets',
  description: 'Learn to build a simple WebSocket client and server in Node.js.',
  get dirname() {
    return Path.join(SRCBOOKS_DIR, this.id);
  },
};

export const EXAMPLE_SRCBOOKS = [
  GETTING_STARTED_SRCBOOK,
  LANGGRAPH_AGENT_SRCBOOK,
  INTRO_TO_WEBSOCKETS_SRCBOOK,
];
