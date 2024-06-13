import fs from 'node:fs/promises';
import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'url';
import path from 'path';
import { WebSocketServer as WsWebSocketServer } from 'ws';
import { SRCBOOKS_DIR } from './constants.mjs';
import app from './server/http.mjs';
import webSocketServer from './server/ws.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __client_dist = path.join(__dirname, '/../client_dist/');

// Create our private ~/.srcbook directory, and its child srcbooks/ directory
console.log("\nCreating srcbook directory if it doesn't exist...");
await fs.mkdir(SRCBOOKS_DIR, { recursive: true });

// Serve the static files, compiled from the packages/web/ React app
console.log('\nServing static files (React app)...');
app.use(express.static(__client_dist));

const server = http.createServer(app);

console.log('\nCreating WebSocket server...');
const wss = new WsWebSocketServer({ server });
wss.on('connection', webSocketServer.onConnection);

// Serve the react-app for all other routes, handled by client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__client_dist, 'index.html'));
});

const port = process.env.PORT || 2150;
server.listen(port, () => {
  console.log(`\nSrcbook is running at http://localhost:${port}`);
});
