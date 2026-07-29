import EventEmitter from 'node:events';
import type { ChildProcess } from 'node:child_process';
import type { server as tsserver } from 'typescript';
import { parse } from './messages.mjs';

/**
 * This class provides a wrapper around a process running tsserver and is used to communicate
 * with the server, mainly to support diagnostics for user code (type errors, sytnax errors,
 * type definitions, etc).
 *
 * tsserver is not documented. Here is a brief overview.
 *
 * tsserver is a process which listens for messages over stdin and
 * sends messages over stdout. tsserver has three types of messages:
 *
 * 1. Request: A request from the client to the server.
 * 2. Response: A response from the server to a specific client request.
 * 3. Event: An event from the server to the client.
 *
 * Request and responses are identified a unique number called `seq`. `seq` is incremented
 * for each request the client sends. The client will send a `seq` field with its request
 * and the server will provide a `request_seq` in its response which is used to tie a message
 * from the server to a specific request from the client.
 *
 * Events can arrive at any time but are often used as an asynchronous response from the server.
 * For example, syntax and semantic diagnostics are sent as events when using the `geterr` command.
 *
 * Most of this is learned by reading through the source (protocol.ts) as well as trial
 * and error. They also have an introduction, but it's hardly useful. See links below.
 *
 * - https://github.com/microsoft/TypeScript/blob/v5.5.3/src/server/protocol.ts
 * - https://github.com/microsoft/TypeScript/wiki/Standalone-Server-(tsserver)
 */
type PendingRequest = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

// Requests are interactive (hover, completions, go-to-definition), so a slow answer
// is no more useful than no answer, and every request must eventually settle.
const REQUEST_TIMEOUT_MS = 10_000;

export class TsServer extends EventEmitter {
  private _seq: number = 0;
  private buffered: Buffer = Buffer.from('');
  private readonly process: ChildProcess;
  private readonly pending: Record<number, PendingRequest> = {};

  constructor(process: ChildProcess) {
    super();
    this.process = process;
    this.process.stdout?.on('data', (chunk) => {
      // This runs in a 'data' listener, so a throw from parse() — which happens on
      // any framing it doesn't recognise — would be an uncaught exception. Drop the
      // buffer and carry on instead: tsserver output is a best-effort feature, not
      // something worth ending the process over.
      try {
        const { messages, buffered } = parse(chunk, this.buffered);
        this.buffered = buffered;
        for (const message of messages) {
          if (message.type === 'response') {
            this.handleResponse(message);
          } else if (message.type === 'event') {
            this.handleEvent(message);
          }
        }
      } catch (e) {
        console.error(`Error parsing tsserver output: ${(e as Error).message}`);
        this.buffered = Buffer.from('');
      }
    });

    // Anything still waiting on a response will never get one once the process is
    // gone. Without this those promises hang forever and leak their resolvers.
    this.process.on('exit', (code, signal) => {
      this.rejectPending(new Error(`tsserver exited (code ${code}, signal ${signal})`));
    });
  }

  private rejectPending(error: Error) {
    for (const seq of Object.keys(this.pending)) {
      const entry = this.pending[Number(seq)];
      if (entry) {
        clearTimeout(entry.timeout);
        entry.reject(error);
      }
      delete this.pending[Number(seq)];
    }
  }

  private get seq() {
    return this._seq++;
  }

  private handleResponse(response: tsserver.protocol.Response) {
    const entry = this.pending[response.request_seq];

    if (!entry) {
      console.warn(
        `Received a response for command '${response.command}' and request_seq '${response.request_seq}' but no pending request was found. It may have timed out.`,
      );

      return;
    }

    clearTimeout(entry.timeout);
    delete this.pending[response.request_seq];

    entry.resolve(response);
  }

  private handleEvent(event: tsserver.protocol.Event) {
    this.emit(event.event, event);
  }

  private send(request: tsserver.protocol.Request) {
    this.process.stdin?.write(JSON.stringify(request) + '\n');
  }

  private sendWithResponsePromise<T>(request: tsserver.protocol.Request) {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        delete this.pending[request.seq];
        reject(new Error(`tsserver did not respond to '${request.command}' in time`));
      }, REQUEST_TIMEOUT_MS);

      this.pending[request.seq] = { resolve, reject, timeout };
      this.send(request);
    });
  }

  /**
   * Wrapper around the `semanticDiag` event for convenience and type safety.
   */
  onSemanticDiag(callback: (event: tsserver.protocol.DiagnosticEvent) => void) {
    this.on('semanticDiag', callback);
  }

  /**
   * Wrapper around the `syntaxDiag` event for convenience and type safety.
   */
  onSyntaxDiag(callback: (event: tsserver.protocol.DiagnosticEvent) => void) {
    this.on('syntaxDiag', callback);
  }

  /**
   * Wrapper around the `suggestionDiag` event for convenience and type safety.
   */
  onSuggestionDiag(callback: (event: tsserver.protocol.DiagnosticEvent) => void) {
    this.on('suggestionDiag', callback);
  }

  /**
   * Shutdown the underlying tsserver process.
   */
  shutdown() {
    this.removeAllListeners();
    this.rejectPending(new Error('tsserver was shut down'));
    return this.process.kill('SIGTERM');
  }

  /**
   * Explicitly 'open' a file in tsserver.
   *
   * This is used to tell tsserver to start tracking a file and all its dependencies.
   */
  open(args: tsserver.protocol.OpenRequestArgs) {
    return this.send({
      seq: this.seq,
      type: 'request',
      command: 'open',
      arguments: args,
    });
  }

  /**
   * Explicitly 'close' a file in tsserver.
   *
   * This is used to tell tsserver to stop tracking a file.
   */
  close(args: tsserver.protocol.FileRequestArgs) {
    return this.send({
      seq: this.seq,
      type: 'request',
      command: 'close',
      arguments: args,
    });
  }

  /**
   * Ask tsserver to send diagnostics for a set of files.
   *
   * This is used to get the errors for a set of files in a project.
   *
   * Note that the diagnostics are sent as asynchronous events instead of responding to this request.
   */
  geterr(args: tsserver.protocol.GeterrRequestArgs) {
    this.send({
      seq: this.seq,
      type: 'request',
      command: 'geterr',
      arguments: args,
    });
  }

  /**
   * Reload the project in tsserver.
   *
   * This is used to tell tsserver to reload the project configuration
   * which helps ensure that the project is up-to-date. This helps resolve
   * errors that can occur when renaming files.
   */
  reloadProjects() {
    this.send({
      seq: this.seq,
      type: 'request',
      command: 'reloadProjects',
    });
  }

  /**
   * Get info about the project.
   *
   * This can be useful during development to inspect the tsserver integration.
   */
  projectInfo(args: tsserver.protocol.ProjectInfoRequestArgs) {
    return this.sendWithResponsePromise<tsserver.protocol.ProjectInfoResponse>({
      seq: this.seq,
      type: 'request',
      command: 'projectInfo',
      arguments: args,
    });
  }

  /**
   * Get info about a term at a specific location in a file.
   *
   * This is used for type definitions and documentation lookups on hover.
   */
  quickinfo(args: tsserver.protocol.FileLocationRequestArgs) {
    return this.sendWithResponsePromise<tsserver.protocol.QuickInfoResponse>({
      seq: this.seq,
      type: 'request',
      command: 'quickinfo',
      arguments: args,
    });
  }

  getDefinitionLocation(args: tsserver.protocol.FileLocationRequestArgs) {
    return this.sendWithResponsePromise<tsserver.protocol.DefinitionResponse>({
      seq: this.seq,
      type: 'request',
      command: 'definition',
      arguments: args,
    });
  }

  getCompletions(args: tsserver.protocol.FileLocationRequestArgs) {
    return this.sendWithResponsePromise<{ body: tsserver.protocol.CompletionEntry[] }>({
      seq: this.seq,
      type: 'request',
      command: 'completions',
      arguments: args,
    });
  }
}
