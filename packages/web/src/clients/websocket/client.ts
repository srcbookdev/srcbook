/* eslint-disable @typescript-eslint/no-explicit-any */

import z from 'zod';

// A _message_ over websockets
const WebSocketMessageSchema = z.tuple([
  z.string(), // The _topic_, eg: "sessions:123"
  z.string(), // The _event_, eg: "cell:updated"
  z.record(z.string(), z.any()), // The _payload_, eg: "{cell: { <cell properties> }}"
]);

export default class WebSocketClient {
  private readonly socket: WebSocket;

  private callbacks: Record<string, Array<(event: string, payload: Record<string, any>) => void>> =
    {};

  constructor(url: string) {
    this.socket = new WebSocket(url);

    this.socket.addEventListener('message', (event) => {
      if (event.type === 'message') {
        this.handleIncomingMessage(event.data);
      } else {
        console.warn(`Received unknown websockete event '${event.type}'`);
      }
    });

    this.socket.addEventListener('open', () => {
      // TODO: track open state?
    });

    this.socket.addEventListener('close', () => {
      console.warn('WebSocket connection closed');
      // TODO: reopen?
    });
  }

  on(topic: string, callback: (event: string, payload: Record<string, any>) => void) {
    this.callbacks[topic] = this.callbacks[topic] || [];
    this.callbacks[topic].push(callback);
  }

  off(topic: string, callback: (event: string, payload: Record<string, any>) => void) {
    const callbacks = (this.callbacks[topic] || []).filter((cb) => cb !== callback);

    if (callbacks.length === 0) {
      delete this.callbacks[topic];
    } else {
      this.callbacks[topic] = callbacks;
    }
  }

  push(topic: string, event: string, payload: Record<string, any>) {
    this.socket.send(JSON.stringify([topic, event, payload]));
  }

  private handleIncomingMessage(eventData: string) {
    const parsed = JSON.parse(eventData);
    const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);
    for (const callback of this.callbacks[topic] || []) {
      callback(event, payload);
    }
  }
}
