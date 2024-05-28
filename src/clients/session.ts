type Message = string;
type MessageType = Record<string, any>;
type MessagePayloadType = { type: Message; message: MessageType };
type MessageCallbackType = (message: MessageType) => void;

export default class SessionClient {
  private readonly socket: WebSocket;
  private readonly callbacks: Record<Message, MessageCallbackType[]>;
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

  send(type: Message, message: MessageType) {
    const payload = { type, message };

    if (this.open) {
      this.socket.send(JSON.stringify(payload));
    } else {
      this.queue.push(payload);
    }
  }

  receive(type: Message, callback: MessageCallbackType) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push(callback);
  }
}
