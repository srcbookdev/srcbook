import { WebSocketMessageSchema } from '@srcbook/shared';

export class WebSocketClient {
  private ws: WebSocket;
  topic: string;

  constructor(url: string, sessionId: string) {
    this.ws = new WebSocket(url);
    this.topic = `session:${sessionId}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }

  // This needs to support more events. Hardcoding for simple MVP
  sendMessage(event: string, message: any): void {
    const payload = [this.topic, event, message];
    this.ws.send(JSON.stringify(payload));
  }

  onMessage(
    callback: (data: { topic: string; eventName: string; payload: unknown }) => void,
  ): void {
    this.ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data as string);
      const [topic, eventName, payload] = WebSocketMessageSchema.parse(parsed);
      if (topic !== this.topic) {
        console.warn(`Server received unknown topic '${topic}. Expected '${this.topic}'`);
      }
      callback({ topic, eventName, payload });
    };
  }
}
