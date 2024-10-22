/* eslint-disable @typescript-eslint/no-explicit-any */

import z from 'zod';
import WebSocketClient from '@/clients/websocket/client';
import { randomid } from '@srcbook/shared';

export default class Channel<
  I extends Record<string, z.ZodSchema<any>>,
  O extends Record<string, z.ZodSchema<any>>,
> {
  readonly topic: string;

  readonly events: {
    incoming: I;
    outgoing: O;
  };

  private subscribed: boolean;

  private subscriptionId: string | null;

  private readonly queue: Array<
    {
      [K in keyof O & string]: {
        event: K;
        payload: z.TypeOf<O[K]>;
      };
    }[keyof O & string]
  >;

  private readonly client: WebSocketClient;

  private readonly callbacks: Record<string, Array<(payload: Record<string, any>) => void>>;

  private readonly receive: <K extends keyof I & string>(event: K, payload: z.TypeOf<I[K]>) => void;

  constructor(client: WebSocketClient, topic: string, events: { incoming: I; outgoing: O }) {
    this.topic = topic;
    this.queue = [];
    this.client = client;
    this.events = events;
    this.callbacks = {};
    this.subscribed = false;
    this.subscriptionId = null;

    this.receive = <K extends keyof I & string>(event: K, payload: z.TypeOf<I[K]>) => {
      if (event === 'subscribed') {
        this.receiveSubscribedEvent(payload);
        return;
      }

      // Ignore events until we are subscribed.
      if (!this.subscribed) {
        return;
      }

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
    if (this.subscribed) {
      return;
    }

    this.subscriptionId = randomid();
    this.client.push(this.topic, 'subscribe', { id: this.subscriptionId });
    this.client.on(this.topic, this.receive);
  }

  unsubscribe() {
    this.subscribed = false;
    this.subscriptionId = null;
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
    // Queue outgoing events until we are subscribed.
    if (!this.subscribed) {
      this.queue.push({ event, payload });
      return;
    }

    const schema = this.events.outgoing[event];

    if (schema === undefined) {
      throw new Error(`Cannot push unknown event '${event}' for topic '${this.topic}'`);
    }

    this.client.push(this.topic, event, schema.parse(payload));
  }

  private receiveSubscribedEvent(payload: { id: string }) {
    // This shouldn't normally happen, but could if multiple channels for the
    // same topic were used or if duplicate events sent (cough cough, useEffect).
    if (this.subscriptionId !== payload.id) {
      return;
    }

    this.subscribed = true;
    this.subscriptionId = null;
    this.flush();
  }

  private flush() {
    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      this.push(message.event, message.payload);
    }
  }
}
