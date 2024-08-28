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


## WebSocket Events

### Client to Server

1. `REGISTER_ACTION`
   - Registers an action with the server.
   - Payload:
     ```typescript
     {
       type: 'REGISTER_ACTION',
       actionId: string
     }
     ```

2. `IO_AWAIT_CALL`
   - Indicates that the client is waiting for user input.
   - Payload:
     ```typescript
     {
       type: 'IO_AWAIT_CALL',
       componentId: string,
       componentType: string,
       props: any
     }
     ```

3. `ACTION_RESULT`
   - Sends the result of an executed action.
   - Payload:
     ```typescript
     {
       type: 'ACTION_RESULT',
       actionId: string,
       result: any
     }
     ```

4. `ACTION_ERROR`
   - Sends an error that occurred during action execution.
   - Payload:
     ```typescript
     {
       type: 'ACTION_ERROR',
       actionId: string,
       error: string
     }
     ```

### Server to Client

1. `ACTION_REGISTERED`
   - Confirms that an action has been registered.
   - Payload:
     ```typescript
     {
       type: 'ACTION_REGISTERED',
       actionId: string,
       success: boolean,
       error?: string
     }
     ```

2. `EXECUTE_ACTION`
   - Requests the client to execute a specific action.
   - Payload:
     ```typescript
     {
       type: 'EXECUTE_ACTION',
       actionId: string
     }
     ```

3. `IO_RESPONSE`
   - Sends user input back to the client.
   - Payload:
     ```typescript
     {
       type: 'IO_RESPONSE',
       componentId: string,
       value: any
     }
     ```

## IO Component Types

1. `INPUT_TEXT`
   - A text input field.
   - Props:
     ```typescript
     {
       label: string,
       placeholder?: string,
       defaultValue?: string
     }
     ```

2. `INPUT_NUMBER`
   - A number input field.
   - Props:
     ```typescript
     {
       label: string,
       min?: number,
       max?: number,
       step?: number,
       defaultValue?: number
     }
     ```

3. `DISPLAY_MARKDOWN`
   - Displays formatted markdown content.
   - Props:
     ```typescript
     {
       content: string
     }
