// - Manages WebSocket communication
// - Keeps track of active IOComponents
// - Handles sending and receiving messages
import { WebSocketClient } from './WebSocketClient.js';
import { IOComponent } from './IOComponent.js';
import { IoResponsePayloadSchema } from '@srcbook/shared';

export class IOClient {
  private wsClient: WebSocketClient;
  private components: Map<string, IOComponent> = new Map();

  constructor() {
    // This should be set by the node process spawning the UIApp instance.
    const wsUrl = process.env.SRCBOOK_WS_URL!;
    const sessionId = process.env.SRCBOOK_SESSION_ID!;
    this.wsClient = new WebSocketClient(wsUrl, sessionId);
  }

  async connect(): Promise<void> {
    await this.wsClient.connect();

    // Subscribe to the session topic
    // TODO: ack
    this.wsClient.sendMessage('subscribe', {});

    this.wsClient.onMessage(this.handleMessage.bind(this));
  }

  addComponent(component: IOComponent): void {
    this.components.set(component.id, component);
  }

  async awaitUserInput(component: IOComponent): Promise<any> {
    this.wsClient.sendMessage('io:ui:await_response', {
      type: 'IO_AWAIT_RESPONSE',
      componentId: component.id,
      componentType: component.type,
      props: component.props,
    });

    return new Promise((resolve) => {
      component.setResolver(resolve);
    });
  }

  private handleMessage(data: { topic: string; eventName: string; payload: unknown }): void {
    if (data.eventName === 'ui:io:response') {
      console.log('Received response from UI', data.payload);
      const parsed = IoResponsePayloadSchema.parse(data.payload);
      const component = this.components.get(parsed.componentId);
      if (component) {
        // Note that if we had more complex components, this would lead to a SET_STATE transition
        component.resolve(parsed.value);
        // cleanup?
      }
    }
  }
}
