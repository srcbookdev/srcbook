import { Server } from 'node:http';
import z from 'zod';
import { WebSocketMessageSchema } from '@srcbook/shared';
import { RawData, WebSocket, WebSocketServer as WsWebSocketServer } from 'ws';

const VALID_TOPIC_RE = /^[a-zA-Z0-9_:]+$/;

/**
 * Channel is responsible for dispatching incoming and outgoing messages for a given topic.
 *
 * Examples:
 *
 *     const channel = new Channel("session")   // matches "session" only
 *     const channel = new Channel("session:*") // matches "session:123", "session:456", etc.
 *
 */
export class Channel {
  readonly topic: string;

  readonly events: {
    incoming: Record<
      string,
      { schema: z.ZodTypeAny; handler: (payload: Record<string, any>) => void }
    >;
    outgoing: Record<string, z.ZodTypeAny>;
  } = { incoming: {}, outgoing: {} };

  private wildcardMatch = false;

  constructor(topic: string) {
    if (topic.endsWith(':*')) {
      // Remove asterisk from topic
      topic = topic.slice(0, -1);
      this.wildcardMatch = true;
    }

    if (!VALID_TOPIC_RE.test(topic)) {
      throw new Error(`Invalid channel topic '${topic}'`);
    }

    this.topic = topic;
  }

  matches(topic: string) {
    if (topic === this.topic) {
      return true;
    }

    if (this.wildcardMatch) {
      return topic.startsWith(this.topic) && topic.length > this.topic.length;
    }

    return false;
  }

  incoming<T extends z.ZodTypeAny>(
    event: string,
    schema: T,
    handler: (payload: z.infer<T>) => void,
  ) {
    this.events.incoming[event] = { schema, handler };
    return this;
  }

  outgoing<T extends z.ZodTypeAny>(event: string, schema: T) {
    this.events.outgoing[event] = schema;
    return this;
  }
}

type ConnectionType = {
  socket: WebSocket;
  subscriptions: string[];
};

export default class WebSocketServer {
  private readonly channels: Channel[] = [];
  private connections: ConnectionType[] = [];

  constructor(options: { server: Server }) {
    const wss = new WsWebSocketServer({ server: options.server });

    wss.on('connection', (socket, request) => {
      const url = new URL(request.url!, `http://${request.headers.host}`);

      const match = url.pathname.match(/^\/websocket\/?$/);
      if (match === null) {
        socket.close();
        return;
      }

      const connection = { socket, subscriptions: [] };

      this.connections.push(connection);

      socket.on('error', (error) => {
        // TODO: better error handling
        console.error(error);
      });

      socket.on('close', () => {
        this.removeConnection(socket);
      });

      socket.on('message', (message) => {
        this.handleIncomingMessage(connection, message);
      });
    });
  }

  channel(topic: string) {
    const channel = new Channel(topic);
    this.channels.push(channel);
    return channel;
  }

  broadcast(topic: string, event: string, payload: Record<string, any>) {
    const channel = this.findChannel(topic);

    if (channel === undefined) {
      throw new Error(`Cannot broadcast to unknown topic '${topic}'`);
    }

    const schema = channel.events.outgoing[event];

    if (schema === undefined) {
      throw new Error(`Cannot broadcast to unknown event '${event}'`);
    }

    const validatedPayload = schema.parse(payload);

    for (const conn of this.connections) {
      if (conn.subscriptions.includes(topic)) {
        conn.socket.send(JSON.stringify([topic, event, validatedPayload]));
      }
    }
  }

  private handleIncomingMessage(conn: ConnectionType, message: RawData) {
    const parsed = JSON.parse(message.toString('utf8'));
    const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);

    const channel = this.findChannel(topic);

    if (channel === undefined) {
      console.warn(`Server received unknown topic '${topic}'`);
      return;
    }

    if (event === 'subscribe') {
      conn.subscriptions.push(topic);
      return;
    }

    if (event === 'unsubscribe') {
      conn.subscriptions = conn.subscriptions.filter((t) => t !== topic);
      return;
    }

    const registeredEvent = channel.events.incoming[event];

    if (registeredEvent === undefined) {
      console.warn(`Server received unknown event '${event}' for topic '${topic}'`);
      return;
    }

    const { schema, handler } = registeredEvent;

    const result = schema.safeParse(payload);

    if (!result.success) {
      console.warn(
        `Server received invalid payload for event '${event}' and topic '${topic}':\n\n${JSON.stringify(payload)}\n\n`,
      );
      return;
    }

    handler(result.data);
  }

  private findChannel(topic: string) {
    for (const channel of this.channels) {
      if (channel.matches(topic)) {
        return channel;
      }
    }
  }

  private removeConnection(socket: WebSocket) {
    this.connections = this.connections.filter((conn) => {
      return conn.socket !== socket;
    });
  }
}
