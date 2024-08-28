import { WebSocketClient } from './WebSocketClient.js';
import { IOClient } from './IOClient.js';
import { setIOClient } from './io.js';
import { Action } from './Action.js';

export class UIApp {
  private wsClient: WebSocketClient;
  private ioClient: IOClient;
  private actions: Action[] = [];

  constructor(wsUrl: string) {
    this.wsClient = new WebSocketClient(wsUrl);
    this.ioClient = new IOClient(wsUrl); // Pass the URL directly
  }

  addAction(action: Action) {
    this.actions.push(action);
  }

  async run() {
    await this.wsClient.connect();
    await this.ioClient.connect();
    setIOClient(this.ioClient);

    this.wsClient.onMessage(this.handleMessage.bind(this));

    // Register actions with the client
    for (const action of this.actions) {
      await this.registerAction(action);
    }

    console.log('UIApp is running and ready to execute actions');
  }

  private async registerAction(action: Action) {
    return new Promise<void>((resolve, reject) => {
      this.wsClient.sendMessage({
        type: 'REGISTER_ACTION',
        actionId: action.name,
      });

      const handleRegistration = (data: any) => {
        if (data.type === 'ACTION_REGISTERED' && data.actionId === action.name) {
          if (data.success) {
            resolve();
          } else {
            reject(new Error(data.error));
          }
          this.wsClient.onMessage(this.handleMessage.bind(this));
        }
      };

      // Temporarily replace the message handler
      this.wsClient.onMessage(handleRegistration);
    });
  }

  private async handleMessage(data: any) {
    if (data.type === 'EXECUTE_ACTION') {
      const action = this.actions.find((a) => a.name === data.actionId);
      if (action) {
        try {
          const result = await action.execute();
          this.wsClient.sendMessage({ type: 'ACTION_RESULT', actionId: action.name, result });
        } catch (error) {
          this.wsClient.sendMessage({
            type: 'ACTION_ERROR',
            actionId: action.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    // Handle other message types as needed
  }
}
