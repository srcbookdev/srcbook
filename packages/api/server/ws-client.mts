import { IncomingMessage } from 'node:http';
import z from 'zod';
import { type RawData, WebSocket } from 'ws';
import { WebSocketMessageSchema } from '@srcbook/shared';

type TopicPart = { dynamic: false; segment: string } | { dynamic: true; parameter: string };

export type MessageContextType<Key extends string = string> = {
  topic: string;
  event: string;
  params: Record<Key, string>;
};

type TopicMatch = Pick<MessageContextType, 'topic' | 'params'>;

export interface ConnectionContextType {
  reply: (topic: string, event: string, payload: Record<string, any>) => void;
}

/**
 * Channel is responsible for dispatching incoming messages for a given topic.
 *
 * Topics are strings that represent a channel for messages. Topics
 * can be broken into multiple parts separated by a colon. The following
 * are all examples of valid topics:
 *
 * - session
 * - session:123
 * - room:123:users:456:messages
 *
 * When we define a topic, we can use the `<variable>` syntax to indicate a
 * wildcard match. For example, the topic `room:<roomId>:messages` would match
 * `room:123:messages`, `room:456:messages`, etc.
 *
 * The wildcard syntax must be between two colons (or at the start/end of the string).
 * The text inside must be a valid JavaScript identifier.
 *
 * Examples:
 *
 *     const channel = new Channel("session")             // matches "session" only
 *     const channel = new Channel("session:<sessionId>") // matches "session:123", "session:456", etc.
 *
 */
export class Channel {
  // The topic pattern, e.g. "sessions:<sessionId>"
  readonly topic: string;

  // The parts of the topic string, e.g. "sessions" and "<sessionId>" for "sessions:<sessionId>"
  private readonly parts: TopicPart[];

  readonly events: Record<
    string,
    {
      schema: z.ZodTypeAny;
      handler: (
        payload: Record<string, any>,
        context: MessageContextType,
        conn: ConnectionContextType,
      ) => void;
    }
  > = {};

  onJoinCallback: (topic: string, ws: WebSocket) => void = () => {};

  constructor(topic: string) {
    this.topic = topic;
    this.parts = this.splitIntoParts(topic);
  }

  private splitIntoParts(topic: string) {
    const parts: TopicPart[] = [];

    for (const part of topic.split(':')) {
      const parameter = part.match(/^<([a-zA-Z_]+[a-zA-Z0-9_]*)>$/);

      if (parameter !== null) {
        parts.push({ dynamic: true, parameter: parameter[1] as string });
        continue;
      }

      if (/^[a-zA-Z0-9_]+$/.test(part)) {
        parts.push({ dynamic: false, segment: part });
        continue;
      }

      throw new Error(`Invalid channel topic: ${topic}`);
    }

    return parts;
  }

  match(topic: string): TopicMatch | null {
    const parts = topic.split(':');

    if (parts.length !== this.parts.length) {
      return null;
    }

    const match: TopicMatch = {
      topic: topic,
      params: {},
    };

    for (let i = 0, len = this.parts.length; i < len; i++) {
      const thisPart = this.parts[i] as TopicPart;

      if (thisPart.dynamic) {
        match.params[thisPart.parameter] = parts[i] as string;
        continue;
      } else if (thisPart.segment === parts[i]) {
        continue;
      }

      return null;
    }

    return match;
  }

  on<T extends z.ZodTypeAny>(
    event: string,
    schema: T,
    handler: (
      payload: z.infer<T>,
      context: MessageContextType,
      conn: ConnectionContextType,
    ) => void,
  ) {
    this.events[event] = { schema, handler };
    return this;
  }

  onJoin(callback: (topic: string, ws: WebSocket) => void) {
    this.onJoinCallback = callback;
    return this;
  }
}

type ConnectionType = {
  // Reply only to this connection, not to all connections.
  reply: (topic: string, event: string, payload: Record<string, any>) => void;
  socket: WebSocket;
  subscriptions: string[];
};

export default class WebSocketServer {
  private readonly channels: Channel[] = [];
  private connections: ConnectionType[] = [];

  constructor() {
    this.onConnection = this.onConnection.bind(this);
  }

  onConnection(socket: WebSocket, request: IncomingMessage) {
    const url = new URL(request.url!, `ws://${request.headers.host}`);

    const match = url.pathname.match(/^\/websocket\/?$/);
    if (match === null) {
      socket.close();
      return;
    }

    const connection = {
      socket,
      subscriptions: [],
      reply: (topic: string, event: string, payload: Record<string, any>) => {
        this.send(connection, topic, event, payload);
      },
    };

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
  }

  channel(topic: string) {
    const channel = new Channel(topic);
    this.channels.push(channel);
    return channel;
  }

  broadcast(topic: string, event: string, payload: Record<string, any>) {
    for (const conn of this.connections) {
      if (conn.subscriptions.includes(topic)) {
        this.send(conn, topic, event, payload);
      }
    }
  }

  private handleIncomingMessage(conn: ConnectionType, message: RawData) {
    const parsed = JSON.parse(message.toString('utf8'));
    const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);

    const channelMatch = this.findChannelMatch(topic);

    if (channelMatch === null) {
      console.warn(`Server received unknown topic '${topic}'`);
      return;
    }

    const { channel, match } = channelMatch;

    if (event === 'subscribe') {
      conn.subscriptions.push(topic);
      conn.reply(topic, 'subscribed', { id: payload.id });
      channel.onJoinCallback(topic, conn.socket);
      return;
    }

    if (event === 'unsubscribe') {
      conn.subscriptions = conn.subscriptions.filter((t) => t !== topic);
      return;
    }

    const registeredEvent = channel.events[event];

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

    handler(result.data, { topic: match.topic, event: event, params: match.params }, conn);
  }

  private findChannelMatch(topic: string): { channel: Channel; match: TopicMatch } | null {
    for (const channel of this.channels) {
      const match = channel.match(topic);

      if (match !== null) {
        return { channel, match };
      }
    }

    return null;
  }

  private removeConnection(socket: WebSocket) {
    this.connections = this.connections.filter((conn) => {
      return conn.socket !== socket;
    });
  }

  private send(conn: ConnectionType, topic: string, event: string, payload: Record<string, any>) {
    conn.socket.send(JSON.stringify([topic, event, payload]));
  }
}
