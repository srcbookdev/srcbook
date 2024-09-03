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
// @ts-ignore
import { WebSocketServer as WsWebSocketServer } from 'ws';
import { wss, app, posthog } from '@srcbook/api';
import chalk from 'chalk';
import { pathTo, getPackageJson } from './utils';

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
