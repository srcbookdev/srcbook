// - Manages WebSocket communication
// - Keeps track of active IOComponents
// - Handles sending and receiving messages
import { WebSocketClient } from './WebSocketClient.js';
import { IOComponent } from './IOComponent.js';

export class IOClient {
  private wsClient: WebSocketClient;
  private components: Map<string, IOComponent> = new Map();

  constructor() {
    // This should be set by the node process spawning the UIApp instance.
    const wsUrl = process.env.SRCBOOK_WS_URL!;
    this.wsClient = new WebSocketClient(wsUrl);
  }

  async connect(): Promise<void> {
    await this.wsClient.connect();
    this.wsClient.onMessage(this.handleMessage.bind(this));
  }

  addComponent(component: IOComponent): void {
    this.components.set(component.id, component);
  }

  async awaitUserInput(component: IOComponent): Promise<any> {
    this.wsClient.sendMessage({
      type: 'IO_AWAIT_CALL',
      componentId: component.id,
      componentType: component.type,
      props: component.props,
    });

    return new Promise((resolve) => {
      component.setResolver(resolve);
    });
  }

  private handleMessage(data: any): void {
    if (data.type === 'IO_RESPONSE') {
      const component = this.components.get(data.componentId);
      if (component) {
        component.resolve(data.value);
        // cleanup?
      }
    }
  }
}
