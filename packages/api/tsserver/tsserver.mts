import { parseTsServerMessages } from './utils.mjs';
import type { ChildProcess } from 'child_process';
import type { server as tsserver } from 'typescript';

export class TsServer {
  private _seq: number = 0;
  private buffered: Buffer = Buffer.from('');
  private readonly process: ChildProcess;
  private readonly resolvers: Record<number, (value: any) => void> = {};

  constructor(process: ChildProcess) {
    this.process = process;
    this.process.stdout?.on('data', (chunk) => {
      const { messages, buffered } = parseTsServerMessages(chunk, this.buffered);
      this.buffered = buffered;
      for (const message of messages) {
        if (message.type === 'response') {
          this.handleResponse(message);
        } else if (message.type === 'event') {
          this.handleEvent(message);
        }
      }
    });
  }

  private get seq() {
    return this._seq++;
  }

  private handleResponse(response: tsserver.protocol.Response) {
    const resolve = this.resolvers[response.request_seq];

    if (!resolve) {
      console.warn(
        `Received a response for command '${response.command}' and request_seq '${response.request_seq}' but no resolver was found. This may be a bug in the code.`,
      );

      return;
    }

    delete this.resolvers[response.request_seq];

    resolve(response);
  }

  private handleEvent(_event: tsserver.protocol.Event) {
    // Ignoring telemetry events for now
  }

  private send(request: tsserver.protocol.Request) {
    this.process.stdin?.write(JSON.stringify(request) + '\n');
  }

  private sendWithResponsePromise<T>(request: tsserver.protocol.Request) {
    return new Promise<T>((resolve) => {
      this.resolvers[request.seq] = resolve;
      this.send(request);
    });
  }

  /**
   * Shutdown the underlying tsserver process.
   */
  shutdown() {
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

  /**
   * Get semantic information about a file.
   *
   * This is used to report type errors in a file.
   */
  semanticDiagnosticsSync(args: tsserver.protocol.SemanticDiagnosticsSyncRequestArgs) {
    return this.sendWithResponsePromise<tsserver.protocol.SemanticDiagnosticsSyncResponse>({
      seq: this.seq,
      type: 'request',
      command: 'semanticDiagnosticsSync',
      arguments: args,
    });
  }

  /**
   * Get syntactic information about a file.
   *
   * This is used to report syntax errors in a file.
   */
  syntacticDiagnosticsSync(args: tsserver.protocol.SyntacticDiagnosticsSyncRequestArgs) {
    return this.sendWithResponsePromise<tsserver.protocol.SyntacticDiagnosticsSyncResponse>({
      seq: this.seq,
      type: 'request',
      command: 'syntacticDiagnosticsSync',
      arguments: args,
    });
  }
}
