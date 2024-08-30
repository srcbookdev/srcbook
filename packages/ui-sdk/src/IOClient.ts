// - Manages WebSocket communication
// - Keeps track of active IOComponents
// - Handles sending and receiving messages
import { WebSocketClient } from './WebSocketClient.js';
import { IOComponent } from './IOComponent.js';
import { IoResponsePayloadSchema } from '@srcbook/shared';

/*
 * Holds the state of the UIApp for a given action.
 * It communicates through a websocket server to the rendering app,
 * but does so by proxying through the @srcbook/api server, which is where the websocket server is hosted.
 */
export class IOClient {
  private wsClient: WebSocketClient;
  private components: Map<string, IOComponent> = new Map();
  private sessionId: string;

  constructor() {
    // This should be set by the node process spawning the UIApp instance.
    const wsUrl = process.env.SRCBOOK_WS_URL!;
    this.sessionId = process.env.SRCBOOK_SESSION_ID!;
    this.wsClient = new WebSocketClient(wsUrl, this.sessionId);
  }

  async connect(): Promise<void> {
    await this.wsClient.connect();

    // TODO: ack mechanics and reconnection
    this.wsClient.sendMessage('subscribe', {});
    this.wsClient.onMessage(this.handleMessage.bind(this));
  }

  addComponent(component: IOComponent): void {
    this.components.set(component.id, component);
  }

  async awaitUserInput(component: IOComponent): Promise<any> {
    this.wsClient.sendMessage('ui:io:await_response', {
      sessionId: this.sessionId,
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
