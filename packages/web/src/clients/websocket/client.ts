/* eslint-disable @typescript-eslint/no-explicit-any */

import { WebSocketMessageSchema } from '@srcbook/shared';

// A connection that is closed on purpose for "normal" reasons.
// https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
const EXPECTED_CLOSURE_CODE = 1000;

// If we lose a connection unexpectedly, retry with a backoff strategy.
const RETRY_IN_MS = [10, 250, 1000, 2500];
const DEFAULT_RETRY_IN_MS = 5000;

export default class WebSocketClient {
  private url: string;

  private socket: WebSocket | null = null;

  private queue: { topic: string; event: string; payload: Record<string, any> }[] = [];

  private callbacks: Record<string, Array<(event: string, payload: Record<string, any>) => void>> =
    {};

  private currentRetry = 0;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  get open() {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
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

    if (this.socket && this.open) {
      this.socket.send(message);
    } else {
      console.error(
        `Attempting to send a message to a socket with readyState '${this.humanReadyState()}'. This is a bug in WebSocketClient.\n\nMessage:\n${message}`,
      );
    }
  }

  private humanReadyState() {
    switch (this.socket?.readyState) {
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

  private retryInMs() {
    return RETRY_IN_MS[this.currentRetry - 1] || DEFAULT_RETRY_IN_MS;
  }

  private onOpen = () => {
    this.currentRetry = 0;
    this.flush();
  };

  private onMessage = (event: MessageEvent<any>) => {
    if (event.type === 'message') {
      this.handleIncomingMessage(event.data);
    } else {
      console.warn(`Received unknown WebSocket event '${event.type}'`);
    }
  };

  private onClose = (event: CloseEvent) => {
    this.teardown();

    // If we lost the connection for unexpected reasons, retry.
    if (event.code !== EXPECTED_CLOSURE_CODE) {
      this.currentRetry += 1;
      setTimeout(this.connect, this.retryInMs());
    }
  };

  private onError = () => {
    // NO-OP for now
  };

  private connect = () => {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', this.onOpen);
    this.socket.addEventListener('message', this.onMessage);
    this.socket.addEventListener('close', this.onClose);
    this.socket.addEventListener('error', this.onError);
  };

  private teardown() {
    if (this.socket) {
      this.socket.removeEventListener('open', this.onOpen);
      this.socket.removeEventListener('message', this.onMessage);
      this.socket.removeEventListener('close', this.onClose);
      this.socket.removeEventListener('error', this.onError);
    }

    this.socket = null;
  }
}
