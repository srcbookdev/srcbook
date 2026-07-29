import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';
import z from 'zod';
import WebSocketServer, { Channel } from '../server/ws-client.mjs';

describe('Channel.match', () => {
  it('matches a static topic exactly', () => {
    const channel = new Channel('session');
    expect(channel.match('session')).toEqual({ topic: 'session', params: {} });
    expect(channel.match('sessions')).toBeNull();
    expect(channel.match('session:123')).toBeNull();
  });

  it('extracts a wildcard parameter', () => {
    const channel = new Channel('session:<sessionId>');
    expect(channel.match('session:abc123')).toEqual({
      topic: 'session:abc123',
      params: { sessionId: 'abc123' },
    });
  });

  it('requires the same number of segments', () => {
    const channel = new Channel('session:<sessionId>');
    expect(channel.match('session')).toBeNull();
    expect(channel.match('session:abc:extra')).toBeNull();
  });

  it('supports several wildcards', () => {
    const channel = new Channel('room:<roomId>:users:<userId>');
    expect(channel.match('room:1:users:2')).toEqual({
      topic: 'room:1:users:2',
      params: { roomId: '1', userId: '2' },
    });
    expect(channel.match('room:1:groups:2')).toBeNull();
  });

  it('rejects topic patterns that are not valid identifiers', () => {
    expect(() => new Channel('session:<not-valid>')).toThrow(/Invalid channel topic/);
    expect(() => new Channel('session:has space')).toThrow(/Invalid channel topic/);
  });
});

/** Stand-in for a ws socket: records what the server sends. */
class FakeSocket extends EventEmitter {
  sent: string[] = [];
  closed: { code?: number; reason?: string } | null = null;

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.closed = { code, reason };
  }

  messages() {
    return this.sent.map((raw) => JSON.parse(raw));
  }

  asWebSocket() {
    return this as unknown as WebSocket;
  }
}

function request(origin = 'http://localhost:2150', url = '/websocket'): IncomingMessage {
  return {
    url,
    headers: { host: 'localhost:2150', origin },
  } as unknown as IncomingMessage;
}

function connect(wss: WebSocketServer, origin?: string) {
  const socket = new FakeSocket();
  wss.onConnection(socket.asWebSocket(), request(origin));
  return socket;
}

function send(socket: FakeSocket, message: unknown) {
  socket.emit('message', Buffer.from(JSON.stringify(message), 'utf8'));
}

describe('WebSocketServer', () => {
  it('closes connections on paths other than /websocket', () => {
    const wss = new WebSocketServer();
    const socket = new FakeSocket();
    wss.onConnection(socket.asWebSocket(), request(undefined, '/not-websocket'));
    expect(socket.closed).not.toBeNull();
  });

  it('rejects a connection from a disallowed origin', () => {
    const wss = new WebSocketServer();
    const socket = connect(wss, 'https://evil.example.com');
    expect(socket.closed?.code).toBe(1008);
  });

  it('subscribes and dispatches an event to its handler', () => {
    const wss = new WebSocketServer();
    const received: Array<{ payload: any; params: any }> = [];

    wss
      .channel('session:<sessionId>')
      .on('cell:exec', z.object({ cellId: z.string() }), (payload, context) => {
        received.push({ payload, params: context.params });
      });

    const socket = connect(wss);
    send(socket, ['session:abc', 'subscribe', { id: 'sub-1' }]);
    send(socket, ['session:abc', 'cell:exec', { cellId: 'cell-1' }]);

    expect(socket.messages()).toContainEqual(['session:abc', 'subscribed', { id: 'sub-1' }]);
    expect(received).toEqual([{ payload: { cellId: 'cell-1' }, params: { sessionId: 'abc' } }]);
  });

  it('broadcasts only to connections subscribed to the topic', () => {
    const wss = new WebSocketServer();
    wss.channel('session:<sessionId>');

    const subscribed = connect(wss);
    const other = connect(wss);

    send(subscribed, ['session:abc', 'subscribe', { id: 'sub-1' }]);
    send(other, ['session:xyz', 'subscribe', { id: 'sub-2' }]);

    wss.broadcast('session:abc', 'cell:updated', { cell: { id: 'c1' } });

    expect(subscribed.messages()).toContainEqual([
      'session:abc',
      'cell:updated',
      { cell: { id: 'c1' } },
    ]);
    expect(other.messages()).not.toContainEqual([
      'session:abc',
      'cell:updated',
      { cell: { id: 'c1' } },
    ]);
  });

  it('stops broadcasting after unsubscribe', () => {
    const wss = new WebSocketServer();
    wss.channel('session:<sessionId>');

    const socket = connect(wss);
    send(socket, ['session:abc', 'subscribe', { id: 'sub-1' }]);
    send(socket, ['session:abc', 'unsubscribe', {}]);

    wss.broadcast('session:abc', 'cell:updated', {});

    expect(socket.messages().filter(([, event]) => event === 'cell:updated')).toEqual([]);
  });

  // These four are the crash cases. The envelope used to be JSON.parsed and zod-parsed
  // inline in the 'message' listener, so a bad frame was an uncaught exception rather
  // than a dropped message.
  describe('malformed input', () => {
    function serverWithHandler() {
      const wss = new WebSocketServer();
      wss
        .channel('session:<sessionId>')
        .on('cell:exec', z.object({ cellId: z.string() }), () => {});
      return wss;
    }

    it('survives a frame that is not JSON', () => {
      const socket = connect(serverWithHandler());
      expect(() => socket.emit('message', Buffer.from('not json', 'utf8'))).not.toThrow();
    });

    it('survives a frame that is JSON but not a valid envelope', () => {
      const wss = serverWithHandler();
      const socket = connect(wss);
      expect(() => send(socket, { not: 'a tuple' })).not.toThrow();
      expect(() => send(socket, ['only-one-element'])).not.toThrow();
    });

    it('ignores an unknown topic and an unknown event', () => {
      const wss = serverWithHandler();
      const socket = connect(wss);
      expect(() => send(socket, ['nope:abc', 'cell:exec', { cellId: 'c' }])).not.toThrow();
      expect(() => send(socket, ['session:abc', 'nope', {}])).not.toThrow();
    });

    it('ignores a payload that fails its schema', () => {
      const wss = serverWithHandler();
      const socket = connect(wss);
      expect(() => send(socket, ['session:abc', 'cell:exec', { cellId: 42 }])).not.toThrow();
    });
  });

  // Handlers are async and throw freely — findSession throws for an unknown session id,
  // which a reconnecting client can trigger by itself. Unawaited, that was an unhandled
  // rejection, and Node exits the process on those by default.
  describe('handler errors', () => {
    // These deliberately trigger the error path, which logs. Silenced so a passing
    // run doesn't print stack traces that look like failures.
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not throw when a handler throws synchronously', () => {
      const wss = new WebSocketServer();
      wss.channel('session:<sessionId>').on('cell:exec', z.object({}), () => {
        throw new Error('boom');
      });

      const socket = connect(wss);
      expect(() => send(socket, ['session:abc', 'cell:exec', {}])).not.toThrow();
    });

    it('catches a rejected promise from an async handler', async () => {
      const wss = new WebSocketServer();
      let settled = false;

      wss.channel('session:<sessionId>').on('cell:exec', z.object({}), async () => {
        settled = true;
        throw new Error('Session with id abc not found');
      });

      const socket = connect(wss);
      send(socket, ['session:abc', 'cell:exec', {}]);

      // Give the rejection a turn to propagate. If it were unhandled, vitest would
      // report an unhandled rejection for this test.
      await new Promise((resolve) => setImmediate(resolve));
      expect(settled).toBe(true);
    });
  });
});
