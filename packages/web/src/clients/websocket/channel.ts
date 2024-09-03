/* eslint-disable @typescript-eslint/no-explicit-any */

import type z from 'zod';
import type WebSocketClient from '@/clients/websocket/client';

export default class Channel<
  I extends Record<string, z.ZodSchema>,
  O extends Record<string, z.ZodSchema>,
> {
  readonly topic: string;

  readonly events: {
    incoming: I;
    outgoing: O;
  };

  private readonly client: WebSocketClient;

  private readonly callbacks: Record<string, ((payload: Record<string, any>) => void)[]>;

  private readonly receive: (event: string, payload: Record<string, any>) => void;

  constructor(client: WebSocketClient, topic: string, events: { incoming: I; outgoing: O }) {
    this.topic = topic;
    this.client = client;
    this.events = events;
    this.callbacks = {};

    this.receive = (event: string, payload: Record<string, any>) => {
      const schema = this.events.incoming[event];

      if (schema === undefined) {
        throw new Error(`Channel received unknown event '${event}' for topic '${this.topic}'`);
      }

      const result = schema.safeParse(payload);

      if (!result.success) {
        throw new Error(
          `Channel received invalid payload for '${event}' and topic '${this.topic}':\n\n${JSON.stringify(payload)}\n\n`,
        );
      }

      for (const callback of this.callbacks[event] || []) {
        callback(result.data);
      }
    };
  }

  subscribe() {
    this.client.push(this.topic, 'subscribe', {});
    this.client.on(this.topic, this.receive);
  }

  unsubscribe() {
    this.client.push(this.topic, 'unsubscribe', {});
    this.client.off(this.topic, this.receive);
  }

  on<K extends keyof I & string>(event: K, callback: (payload: z.TypeOf<I[K]>) => void): void {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event]?.push(callback);
  }

  off<K extends keyof I & string>(event: K, callback: (payload: z.TypeOf<I[K]>) => void): void {
    const callbacks = (this.callbacks[event] || []).filter((cb) => cb !== callback);

    if (callbacks.length === 0) {
      delete this.callbacks[event];
    } else {
      this.callbacks[event] = callbacks;
    }
  }

  push<K extends keyof O & string>(event: K, payload: z.TypeOf<O[K]>): void {
    const schema = this.events.outgoing[event];

    if (schema === undefined) {
      throw new Error(`Cannot push unknown event '${event}' for topic '${this.topic}'`);
    }

    this.client.push(this.topic, event, schema.parse(payload));
  }
}
