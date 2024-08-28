// Base interface for all component types
export interface BaseComponent {
  id: string;
  type: string;
  props: Record<string, any>;
}

// Input Text Component
export interface InputTextComponent extends BaseComponent {
  type: 'INPUT_TEXT';
  props: {
    label: string;
    placeholder?: string;
    defaultValue?: string;
  };
}

// Input Number Component
export interface InputNumberComponent extends BaseComponent {
  type: 'INPUT_NUMBER';
  props: {
    label: string;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
  };
}

// Display Markdown Component
export interface DisplayMarkdownComponent extends BaseComponent {
  type: 'DISPLAY_MARKDOWN';
  props: {
    content: string;
  };
}

// Union type for all possible components
export type UIComponent = InputTextComponent | InputNumberComponent | DisplayMarkdownComponent;

// Message sent from SDK to rendering client
export interface SDKToRendererMessage {
  type: 'IO_AWAIT_CALL';
  componentId: string;
  component: UIComponent;
}

// Message sent from rendering client to SDK
export interface RendererToSDKMessage {
  type: 'IO_RESPONSE';
  componentId: string;
  value: string | number | undefined;
}

// Union type for all possible messages
export type WebSocketMessage = SDKToRendererMessage | RendererToSDKMessage;
