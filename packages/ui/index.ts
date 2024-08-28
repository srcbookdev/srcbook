import * as readline from 'node:readline';

const EVENT_HEADER = '@srcbook/ui:event ';
const COMPONENT_HEADER = '@srcbook/ui:component ';

const promises: Record<string, { resolve: (value: string) => void }> = {};

export function input(attrs: { label: string; placeholder?: string }) {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const payload = { ...attrs, id, type: 'text' };
    process.stdout?.write(COMPONENT_HEADER + JSON.stringify(payload) + '\n');
    promises[id] = { resolve };
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (input) => {
  if (input.startsWith(EVENT_HEADER)) {
    const payload = JSON.parse(input.slice(18));
    if (payload.type === 'submit') {
      const target = payload.target;
      const promise = promises[target.id];
      if (promise) {
        promise.resolve(target.value);
        delete promises[target.id];
      }
    }
  }
  setTimeout(() => rl.close(), 50);
});
