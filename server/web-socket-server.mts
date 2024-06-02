import { Server } from 'node:http';
import z from 'zod';
import { RawData, WebSocket, WebSocketServer as WsWebSocketServer } from 'ws';

const TOPIC_FORMAT = '[a-zA-Z0-9_:]+';
const VALID_TOPIC_RE = new RegExp(`^${TOPIC_FORMAT}$`);

const WebSocketMessageSchema = z.tuple([
  z.string(), // Topic name, eg: "sessions:123"
  z.string(), // Event name, eg: "cell:updated"
  z.record(z.string(), z.any()), // Event message, eg: "{cell: { <cell properties> }}"
]);

type TopicEventType = {
  schema: z.ZodTypeAny;
  handler: (message: Record<string, any>) => void;
};

export class Topic {
  private readonly re: RegExp;

  readonly name: string;

  readonly events: {
    incoming: Record<string, TopicEventType>;
    outgoing: Record<string, z.ZodTypeAny>;
  } = { incoming: {}, outgoing: {} };

  constructor(name: string) {
    if (!VALID_TOPIC_RE.test(name)) {
      throw new Error('Invalid topic name');
    }

    this.name = name;
    this.re = new RegExp(`^${name}(:${TOPIC_FORMAT})?$`);
  }

  matches(topicName: string) {
    return this.re.test(topicName);
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
  private readonly topics: Topic[] = [];
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

  topic(name: string) {
    const topic = new Topic(name);
    this.topics.push(topic);
    return topic;
  }

  broadcast(topicName: string, eventName: string, message: Record<string, any>) {
    const topic = this.findTopic(topicName);

    if (topic === undefined) {
      throw new Error(`Cannot broadcast to unknown topic '${topicName}'`);
    }

    const schema = topic.events.outgoing[eventName];

    if (schema === undefined) {
      throw new Error(`Cannot broadcast to unknown event '${eventName}'`);
    }

    const validatedMessage = schema.parse(message);

    for (const conn of this.connections) {
      if (conn.subscriptions.includes(topicName)) {
        conn.socket.send(JSON.stringify([topicName, eventName, validatedMessage]));
      }
    }
  }

  private handleIncomingMessage(conn: ConnectionType, rawData: RawData) {
    const parsed = JSON.parse(rawData.toString('utf8'));
    const [topicName, eventName, message] = WebSocketMessageSchema.parse(parsed);

    const topic = this.findTopic(topicName);

    if (topic === undefined) {
      console.warn(`Server received unknown topic '${topicName}'`);
      return;
    }

    if (eventName === 'subscribe') {
      conn.subscriptions.push(topicName);
      return;
    }

    if (eventName === 'unsubscribe') {
      conn.subscriptions = conn.subscriptions.filter((t) => t !== topicName);
      return;
    }

    const registeredEvent = topic.events.incoming[eventName];

    if (registeredEvent === undefined) {
      console.warn(`Server received unknown event '${eventName}' for topic '${topicName}'`);
      return;
    }

    const { schema, handler } = registeredEvent;

    const result = schema.safeParse(message);

    if (!result.success) {
      console.warn(
        `Server received invalid message for event '${eventName}' and topic '${topicName}':\n\n${JSON.stringify(message)}\n\n`,
      );
      return;
    }

    handler(result.data);
  }

  private findTopic(topicName: string) {
    for (const topic of this.topics) {
      if (topic.matches(topicName)) {
        return topic;
      }
    }
  }

  private removeConnection(socket: WebSocket) {
    this.connections = this.connections.filter((conn) => {
      return conn.socket !== socket;
    });
  }
}
