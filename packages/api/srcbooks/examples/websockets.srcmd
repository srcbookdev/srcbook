<!-- srcbook:{"language":"javascript"} -->

# Intro to WebSockets

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "ws": "^8.17.1"
  }
}
```

This Srcbook is a fun demonstration of building a simple WebSocket client and server in Node.js using the [ws library](https://github.com/websockets/ws). We'll explore the basic concepts of communicating over WebSockets and showcase Srcbook's ability to host long-running processes.

## WebSockets

[Wikipedia defines](https://en.wikipedia.org/wiki/WebSocket) WebSocket as:

> WebSocket is a computer communications protocol, providing a simultaneous two-way communication channel over a single Transmission Control Protocol (TCP) connection.

The important callout here is "two-way communication channel," which differentiates it from most web-based network communication that follows a request-response pattern. WebSockets enable the server to send a message, _unprompted_, to a client without other tricks like [polling](https://en.wikipedia.org/wiki/Polling_(computer_science)).

Applications typically leverage WebSockets when they need to repeatedly inform the client of state changes, like communication products that push new messages to the client or update the presence of users in a chat room. Other typical use cases involve realtime notifications, ecommerce item availability updates, and forwarding process output to code cells in Srcbook :)

### WebSockets in Node.js

One of the most popular libraries for WebSockets in Node.js is the [ws library](https://www.npmjs.com/package/ws) with over 70 million weekly downloads.

Below we implement a simple WebSocket _server_ using `ws`.

###### simple-server.js

```javascript
import { WebSocketServer } from 'ws';

// Start this simple server on port 5405
const wss = new WebSocketServer({ port: 5405 });

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    console.log('Server received: %s', data);
  });
  console.log("New client connected")
});
```

This simple server does nothing more than wait for incoming connections and log the messages it receives.

Next, we need a _client_ to connect and send messages to it. Note the client is running in a Node.js process, not in the browser. Backends communicate over WebSockets too!

###### simple-client.js

```javascript
import WebSocket from 'ws';

// Reference the same port the server is running on
const ws = new WebSocket('ws://localhost:5405');

ws.on('open', () => {
  ws.send('Hello from simple-client.js');
  ws.close();
});

```

Our simple client establishes a connection with the server, sends one message, and closes the connection. To run this example, first run the server and then run the client. Output is logged under the simple-server.js cell above.

## Stateful connections

The example above is not terribly interesting. WebSockets become more useful when the server tracks open connections and sends messages to the client.

###### stateful-server.js

```javascript
import { WebSocketServer } from 'ws';

// Start this simple server on port 5405
const wss = new WebSocketServer({ port: 5406 });

// Utility to create auto-incrementing ids for clients
const createClientId = ((id) => () => ++id)(0);

const connectedClients = [];

function broadcast(senderId, message) {
  for (const client of connectedClients) {
    // The client who is sending the message should not receive it
    if (client.id !== senderId) {
      client.socket.send(JSON.stringify(message));
    }
  }
}

wss.on('connection', (socket) => {
  const clientId = createClientId();

  // Store the client connection
  connectedClients.push({id: clientId, socket});

  // Inform others a new client has connected
  broadcast(clientId, {
    type: 'client:connected',
    payload: `Client ${clientId} connected`
  });

  // When the server receives a broadcast message,
  // send it to all the other connected clients
  socket.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'broadcast') {
      broadcast(clientId, {
        type: "broadcast",
        payload: message.payload
      })
    }
  });

  socket.on('close', () => {
    // Inform others a client has disconnected
    broadcast(clientId, {
      type: 'client:disconnected',
      payload: `Client ${clientId} disconnected`
    });

    // Important: remember to remove the socket from
    // server state when the connection is closed.
    const idx = connectedClients.findIndex(({id}) => id === clientId);
    connectedClients.splice(idx, 1);
  });
});
```

###### client.js

```javascript
import WebSocket from 'ws';

console.log("Starting up");

const client1 = new WebSocket('ws://localhost:5406');
client1.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(`Client 1 received ${message.type} message: ${message.payload}`)
});

// Simulate latency in between clients connecting
await new Promise((resolve) => setTimeout(resolve, 1500));

const client2 = new WebSocket('ws://localhost:5406');
client2.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(`Client 2 received ${message.type} message: ${message.payload}`)
});

// We put this inside the open event to ensure the client has
// finished connecting to the server before sending a message.
client2.on('open', () => {
  // Client 2 sends a 'broadcast' message which the server will
  // broadcast all other connected clients.
  client2.send(JSON.stringify({type: 'broadcast', payload: 'Hello'}));
});

// Simulate latency in between clients disconnecting
await new Promise((resolve) => setTimeout(resolve, 1500));

client1.close();

// Simulate latency before second client disconnects
await new Promise((resolve) => setTimeout(resolve, 1500));

client2.close();

console.log("Shutting down");
```

## Explanation

The above example illustrates a stateful server that keeps track of the clients whom are connected. The server proactively sends messages to other connected clients when a new client joins and an existing one disconnects. The server also broadcasts messages to all other connected clients on behalf of any given client. This is a heavily simplified version of something like a chat room.

One of the more tedious aspects of this is keeping track of the state about connected clients. This is unlike typical HTTP request/reply patterns in which the server is stateless. It is especially tricky when you scale your WebSocket server horizontally because different clients are connected to different instances of your application. When this happens, state needs to be coordinated amongst all instances of the application, which typically requires extra infrastructure and consequently extra maintanence and performance considerations.
