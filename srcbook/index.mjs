// This is important. It will create necessary directories on the file system. Import this first.
import './lib/initialization.mjs';

// This is important. It will create and setup the database. Import this second.
import './lib/db/index.mjs';

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
import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'url';
import path from 'path';
import { WebSocketServer as WsWebSocketServer } from 'ws';
import { wss, app } from './lib/index.mjs';
import chalk from 'chalk';

function clearScreen() {
  const repeatCount = process.stdout.rows - 2;
  const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : '';
  console.log(blank);
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
}

clearScreen();

console.log(chalk.bgGreen.black('  Srcbook  '));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');

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

console.log(chalk.green('Initialization complete.'));

const port = process.env.PORT || 2150;
server.listen(port, () => {
  console.log(`Running at http://localhost:${port}`);
});
