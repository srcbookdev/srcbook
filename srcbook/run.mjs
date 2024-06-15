/**
 * Run the Srcbook application.
 * For this, we need to:
 *  - Ensure the ~/.srcbook directory and its /srcbooks/ child directory exist
 *  - Serve the react web app frontend
 *  - Start the websocket server
 *  - Serve the API
 *
 */
import fs from 'node:fs/promises';
import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'url';
import path from 'path';
import { WebSocketServer as WsWebSocketServer } from 'ws';
import { SRCBOOKS_DIR, wss, app } from '@srcbook/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __client_dist = path.join(__dirname, '/../web_dist/');

// Create our private ~/.srcbook directory, and its child srcbooks/ directory
console.log("\nCreating srcbook directory if it doesn't exist...");
await fs.mkdir(SRCBOOKS_DIR, { recursive: true });

// Serve the static files, compiled from the packages/web/ React app
console.log('\nServing static files (React app)...');
app.use(express.static(__client_dist));
const server = http.createServer(app);

// Create the WebSocket server
console.log('\nCreating WebSocket server...');
const webSocketServer = new WsWebSocketServer({ server });
webSocketServer.on('connection', wss.onConnection);

// Serve the react-app for all other routes, handled by client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__client_dist, 'index.html'));
});

const port = process.env.PORT || 2150;
server.listen(port, () => {
  console.log(`\nSrcbook is running at http://localhost:${port}`);
});
