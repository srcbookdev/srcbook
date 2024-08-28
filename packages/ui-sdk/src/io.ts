import { IOClient } from './IOClient.js';
import { IOComponent } from './IOComponent.js';
import { IOPromise } from './IOPromise.js';

let client: IOClient | null = null;

export function setIOClient(newClient: IOClient) {
  client = newClient;
}

export const io = {
  input: {
    text: (label: string, props?: any) => {
      if (!client) throw new Error('IOClient not set');
      const component = new IOComponent('INPUT_TEXT', { label, ...props });
      return new IOPromise<string>(component, client);
    },
    number: (label: string, props?: any) => {
      if (!client) throw new Error('IOClient not set');
      const component = new IOComponent('INPUT_NUMBER', { label, ...props });
      return new IOPromise<number>(component, client);
    },
  },
  display: {
    markdown: (content: string, props?: any) => {
      if (!client) throw new Error('IOClient not set');
      const component = new IOComponent('DISPLAY_MARKDOWN', { content, ...props });
      return new IOPromise<void>(component, client);
    },
  },
};
