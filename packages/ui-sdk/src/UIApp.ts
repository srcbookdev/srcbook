import { IOClient } from './IOClient.js';
import { setIOClient } from './io.js';
import { Action } from './Action.js';

export class UIApp {
  private ioClient: IOClient;
  private action: Action;

  constructor(action: Action) {
    // Consider adding the wsClient here if we need to do higher level
    // action communication (like registration, or error handling).
    // Keeping simple for now.
    this.ioClient = new IOClient();
    this.action = action;
  }

  async run() {
    await this.ioClient.connect();
    setIOClient(this.ioClient);

    console.log('UIApp is running');
    await this.action.execute();
  }
}
