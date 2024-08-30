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

// Display Markdown Component
export interface DisplayMarkdownComponent extends BaseComponent {
  type: 'DISPLAY_MARKDOWN';
  props: {
    content: string;
  };
}

// Union type for all possible components
export type UIComponent = InputTextComponent | DisplayMarkdownComponent;
