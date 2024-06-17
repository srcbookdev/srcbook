/* eslint-disable @typescript-eslint/no-explicit-any */

import { WebSocketMessageSchema } from '@srcbook/shared';

export default class WebSocketClient {
  private readonly socket: WebSocket;

  private queue: { topic: string; event: string; payload: Record<string, any> }[] = [];

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
      this.flush();
    });

    this.socket.addEventListener('close', () => {
      console.warn('WebSocket connection closed');
      // TODO: reopen?
    });
  }

  get open() {
    return this.socket.readyState === WebSocket.OPEN;
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
    if (this.open) {
      this.send(topic, event, payload);
    } else {
      this.queue.push({ topic, event, payload });
    }
  }

  private flush() {
    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      this.send(message.topic, message.event, message.payload);
    }
  }

  private send(topic: string, event: string, payload: Record<string, any>) {
    const message = JSON.stringify([topic, event, payload]);

    if (this.open) {
      this.socket.send(message);
    } else {
      console.error(
        `Attempting to send a message to a socket with readyState '${this.humanReadyState()}'. This is a bug in WebSocketClient.\n\nMessage:\n${message}`,
      );
    }
  }

  private humanReadyState() {
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        // This should never happen.
        return 'UNKNOWN';
    }
  }

  private handleIncomingMessage(eventData: string) {
    const parsed = JSON.parse(eventData);
    const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);
    for (const callback of this.callbacks[topic] || []) {
      callback(event, payload);
    }
  }
}
