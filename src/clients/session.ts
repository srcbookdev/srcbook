export type MessageType = string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Message = Record<string, any>;
export type MessagePayloadType = { type: MessageType; message: Message };
export type MessageCallbackType = (message: Message) => void;

export default class SessionClient {
  private readonly socket: WebSocket;
  private readonly callbacks: Record<MessageType, MessageCallbackType[]>;
  private readonly queue: Array<MessagePayloadType>;

  private open: boolean = false;

  constructor(id: string) {
    this.callbacks = {};
    this.queue = [];

    this.socket = new WebSocket(`ws://localhost:2150/sessions/${id}`);

    this.socket.addEventListener('message', (event) => {
      if (event.type === 'message') {
        const { type, message } = JSON.parse(event.data);
        (this.callbacks[type] || []).forEach((cb) => cb(message));
      }
    });

    this.socket.addEventListener('open', () => {
      this.open = true;
      this.queue.forEach((payload) => this.socket.send(JSON.stringify(payload)));
    });

    this.socket.addEventListener('close', () => {
      console.warn('WebSocket connection closed');
      // TODO: reopen?
      this.open = false;
    });
  }

  send(type: MessageType, message: Message) {
    const payload = { type, message };

    if (this.open) {
      this.socket.send(JSON.stringify(payload));
    } else {
      this.queue.push(payload);
    }
  }

  on(type: MessageType, callback: MessageCallbackType) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push(callback);
  }

  off(type: MessageType, callback: MessageCallbackType) {
    const idx = (this.callbacks[type] || []).findIndex((cb) => cb === callback);

    if (idx === -1) {
      throw new Error(`Tried to remove callback for ${type} but no callback was registered`);
    }

    this.callbacks[type].splice(idx, 1);
  }
}
