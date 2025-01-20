/**
 * Run the Srcbook application.
 *
 * For this, we need to:
 *  - Serve the API
 *  - Serve the WebSocket server
 *  - Serve the React frontend
 *
 */
import readline from 'node:readline';
import http from 'node:http';
import express from 'express';
import '../../packages/api/mcp/initMcpHub.mjs';
// @ts-ignore
import { WebSocketServer as WsWebSocketServer } from 'ws';
import { wss, app, posthog } from '@srcbook/api';
import mcpHub from '../../packages/api/mcp/mcphub.mjs';
import chalk from 'chalk';
import { pathTo, getPackageJson } from './utils.mjs';

function clearScreen() {
  const repeatCount = process.stdout.rows - 2;
  const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : '';
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

clearScreen();

console.log(chalk.bgGreen.black('  Srcbook  '));

const PUBLIC_DIR = pathTo('public');
const INDEX_HTML = pathTo('public', 'index.html');

// Serve the static files, compiled from the packages/web/ React app
console.log(chalk.dim('Serving static files (React app)...'));
app.use(express.static(PUBLIC_DIR));
function logServerConnections() {
  const connections = mcpHub.listConnections();
  console.log('--- Current MCP Server Connections ---');
  connections.forEach(conn => {
    console.log(`Server: ${conn.name}`);
    console.log(`  Status: ${conn.status}`);
    console.log(`  Capabilities: ${JSON.stringify(conn.capabilities, null, 2)}`);
    if (conn.error) {
      console.log(`  Error: ${conn.error}`);
    }
    console.log('---------------------------------------');
  });
}
const server = http.createServer(app);

// Create the WebSocket server
console.log(chalk.dim('Creating WebSocket server...'));
const webSocketServer = new WsWebSocketServer({ server });
webSocketServer.on('connection', wss.onConnection);

// Serve the react-app for all other routes, handled by client-side routing
app.get('*', (_req, res) => res.sendFile(INDEX_HTML));

console.log(chalk.green('Initialization complete'));

const port = Number(process.env.PORT ?? 2150);
const url = `http://localhost:${port}`;

// Initialize MCPHub and start servers
(async () => {
  try {
    // Initialize MCPHub (establish connections to MCP servers)
    await mcpHub.initialize();
    console.log('MCPHub initialized successfully.');

    // Log current server connections and capabilities
    logServerConnections();

    // Start the HTTP server
    app.listen(port, () => {
      console.log(`HTTP server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize MCPHub:', error);
    process.exit(1); // Exit the application if MCPHub fails to initialize
  }
})();

posthog.capture({ event: 'user started Srcbook application' });

const { name, version } = getPackageJson();

server.listen(port, () => {
  console.log(`${name}@${version} running at ${url}`);
  // @ts-ignore
  process.send('{"type":"init"}');
});

process.on('SIGINT', async () => {
  // Ensure we gracefully shutdown posthog since it may need to flush events
  posthog.shutdown();
  server.close();
  process.exit();
});
