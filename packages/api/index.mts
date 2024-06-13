import fs from 'node:fs/promises';
import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'url';
import path from 'path';
import { WebSocketServer as WsWebSocketServer } from 'ws';
import { SRCBOOK_DIR } from './constants.mjs';
import app from './server/http.mjs';
import webSocketServer from './server/ws.mjs';

// make sure to await this
console.log("Creating srcbook directory if it doesn't exist...");
await fs.mkdir(SRCBOOK_DIR, { recursive: true });

// TODO use drizzle programmatic API to run the migrations
console.log('TODO: running migrations...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the static files, compiled from the packages/web/ React app
console.log('Serving static files (React app)');
app.use(express.static(path.join(__dirname, '/../client_dist/')));

const server = http.createServer(app);

console.log('Creating WebSocket server');
const wss = new WsWebSocketServer({ server });
wss.on('connection', webSocketServer.onConnection);

// Handles any requests that don't match the API ones declared before
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '/../client_dist/index.html'));
});

const port = process.env.PORT || 2150;
server.listen(port, () => {
  console.log(`Application is running at http://localhost:${port}`);
});
