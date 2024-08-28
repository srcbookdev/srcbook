import type { Renderer, RenderComponent } from './renderer.js';

type IOClient = {
  sendMessage: (message: any) => void;
  onMessage: (callback: (data: any) => void) => void;
  renderer: Renderer;
};

let client: IOClient | null = null;

export const setIOClient = (ioClient: IOClient) => {
  client = ioClient;
};

export const io = {
  input: {
    text: (label: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!client) {
          reject(new Error('IO client not set. Call setIOClient first.'));
          return;
        }

        const component: RenderComponent = {
          type: 'TEXT_INPUT',
          props: { label },
        };

        client.renderer.render(component).then(resolve).catch(reject);
      });
    },
  },
};
