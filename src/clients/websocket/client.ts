/* eslint-disable @typescript-eslint/no-explicit-any */

import z from 'zod';

const WebSocketMessageSchema = z.tuple([
  z.string(), // Topic name, eg: "sessions:123"
  z.string(), // Event name, eg: "cell:updated"
  z.record(z.string(), z.any()), // Event message, eg: "{cell: { <cell properties> }}"
]);

export default class WebSocketClient {
  private readonly socket: WebSocket;

  private callbacks: Record<string, Array<(event: string, message: Record<string, any>) => void>> =
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

  on(topic: string, callback: (event: string, message: Record<string, any>) => void) {
    this.callbacks[topic] = this.callbacks[topic] || [];
    this.callbacks[topic].push(callback);
  }

  off(topic: string, callback: (event: string, message: Record<string, any>) => void) {
    const callbacks = (this.callbacks[topic] || []).filter((cb) => cb !== callback);

    if (callbacks.length === 0) {
      delete this.callbacks[topic];
    } else {
      this.callbacks[topic] = callbacks;
    }
  }

  push(topic: string, event: string, message: Record<string, any>) {
    this.socket.send(JSON.stringify([topic, event, message]));
  }

  private handleIncomingMessage(eventData: string) {
    const parsed = JSON.parse(eventData);
    const [topic, event, message] = WebSocketMessageSchema.parse(parsed);
    for (const callback of this.callbacks[topic] || []) {
      callback(event, message);
    }
  }
}
