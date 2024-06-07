import { REPLServer, start } from 'node:repl';
import WebSocketServer from './server/ws-client.mjs';
import { PassThrough } from 'node:stream';

const sessionRepls: Record<string, ReplService> = {};

class ReplService {
  inputStream: PassThrough;
  outputStream: PassThrough;
  replServer: REPLServer;

  constructor() {
    this.inputStream = new PassThrough();
    this.outputStream = new PassThrough();
    this.replServer = this.createRepl();

    this.outputStream.on('error', (err) => {
      console.error('REPL output error:', err);
    });
    this.inputStream.on('error', (err) => {
      console.error('REPL input error:', err);
    });
  }

  createRepl() {
    return start({
      prompt: '',
      input: this.inputStream,
      output: this.outputStream,
      // Consider activating these and then using a library like ansi-to-html to convert them to HTML
      // Another alternative is to straight up use a terminal emulator like xterm.js
      terminal: false,
      useColors: false,
    });
  }

  sendInput(input: string) {
    // Passing '\n' is important to trigger the REPL to evaluate the input
    this.inputStream.write(input + '\n');
  }

  onOutput(callback: (output: string) => void): void {
    this.outputStream.on('data', (chunk) => {
      callback(chunk.toString());
    });
  }
}

export function getOrCreateRepl(sessionId: string, wss: WebSocketServer) {
  if (!sessionRepls[sessionId]) {
    const repl = new ReplService();
    repl.onOutput((output) => {
      wss.broadcast(`session:${sessionId}`, 'repl:output', { output });
    });
    sessionRepls[sessionId] = repl;
  }
  return sessionRepls[sessionId];
}

export default ReplService;
