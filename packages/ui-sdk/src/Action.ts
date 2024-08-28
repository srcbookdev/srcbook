import { WebSocketClient } from './WebSocketClient.js';

export class Action {
  constructor(private handler: () => Promise<any>) {}

  async execute(client: WebSocketClient): Promise<void> {
    const result = await this.handler();
    client.send({ type: 'ACTION_RESULT', result });
  }

  register(client: WebSocketClient): Promise<void> {
    return new Promise((resolve, reject) => {
      client.sendMessage({
        // TODO share this type
        type: 'REGISTER_ACTION',
        actionId: this.handler.name,
      });

      client.onMessage((data) => {
        if (data.type === 'ACTION_REGISTERED' && data.actionId === this.handler.name) {
          if (data.success) {
            resolve();
          } else {
            reject(new Error(data.error));
          }
        }
      });
    });
}
