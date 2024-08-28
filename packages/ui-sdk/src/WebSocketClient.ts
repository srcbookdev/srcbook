export class WebSocketClient {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
    });
  }

  sendMessage(message: any): void {
    this.ws.send(JSON.stringify(message));
  }

  onMessage(callback: (data: any) => void): void {
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      callback(data);
    };
  }
}
