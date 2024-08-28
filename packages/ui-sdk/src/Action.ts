import { WebSocketClient } from './WebSocketClient.js';

export class Action {
  constructor(private handler: () => Promise<any>) {}

  async execute(client: WebSocketClient): Promise<void> {
    const result = await this.handler();
    client.send({ type: 'ACTION_RESULT', result });
  }
}
