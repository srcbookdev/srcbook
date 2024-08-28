Goal of this is to have a special code cell in srcbooks that can render UIs. The expected code would look like this:
```typescript
import { Action, io } from '@srcbook-ui/sdk';

const greetingAction = new Action('greeting', async () => {
  const name = await io.input.text("What's your name?");
  const age = await io.input.number("How old are you?");
  const greeting = `Hello, ${name}! You are ${age} years old.`;
  await io.display.markdown(greeting);
  return greeting;
});

// UIApp knows how to connect to the proxy WS server
// through an env var passed to it
const app = new UIApp(greetingAction);
app.run();
```
