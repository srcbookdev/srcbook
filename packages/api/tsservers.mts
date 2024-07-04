import { spawn, type ChildProcess } from 'child_process';
import type { server as tsserver } from 'typescript';

/**
 * Parse messages from a chunk of data sent by tsserver.
 *
 * A 'message' takes the form:  "Content-Length: <number>\r\n\r\n<json>". There can be multiple messages in a single chunk of data.
 *
 * TODO: Ensure that the chunk is a complete message. If it's not, we should buffer the data until we have a complete message.
 *
 * Examples:
 *
 *     Example that contains only one message:
 *
 *     "Content-Length: 238\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"projectLoadingStart\",\"body\":{\"projectName\":\"/Users/ben/.srcbook/tsconfig.json\",\"reason\":\"Creating possible configured project for /Users/ben/.srcbook/srcbooks/4bs7n0hg8n0163du5ik9shjdmc/main.ts to open\"}}\n"
 *
 *
 *     Example with multiple messages:
 *
 *     "Content-Length: 609\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"telemetry\",\"body\":{\"telemetryEventName\":\"projectInfo\",\"payload\":{\"projectId\":\"ebdc8edc2317622018a25bdb7fd3ef5e41538960354c166d5577561381bed531\",\"fileStats\":{\"js\":0,\"jsSize\":0,\"jsx\":0,\"jsxSize\":0,\"ts\":5,\"tsSize\":2084,\"tsx\":0,\"tsxSize\":0,\"dts\":7,\"dtsSize\":1567085,\"deferred\":0,\"deferredSize\":0},\"compilerOptions\":{},\"typeAcquisition\":{\"enable\":false,\"include\":false,\"exclude\":false},\"extends\":false,\"files\":false,\"include\":false,\"exclude\":false,\"compileOnSave\":false,\"configFileName\":\"tsconfig.json\",\"projectType\":\"configured\",\"languageServiceEnabled\":true,\"version\":\"5.5.3\"}}}\nContent-Length: 435\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"configFileDiag\",\"body\":{\"triggerFile\":\"/Users/ben/.srcbook/srcbooks/4bs7n0hg8n0163du5ik9shjdmc/main.ts\",\"configFile\":\"/Users/ben/.srcbook/tsconfig.json\",\"diagnostics\":[{\"start\":{\"line\":2,\"offset\":3},\"end\":{\"line\":2,\"offset\":11},\"text\":\"'module' should be set inside the 'compilerOptions' object of the config json file\",\"code\":6258,\"category\":\"error\",\"fileName\":\"/Users/ben/.srcbook/tsconfig.json\"}]}}\nContent-Length: 76\r\n\r\n{\"seq\":0,\"type\":\"event\",\"event\":\"typingsInstallerPid\",\"body\":{\"pid\":44901}}\n"
 *
 */
function parseTsServerMessages(
  chunk: Buffer,
): Array<tsserver.protocol.Event | tsserver.protocol.Response> {
  const data = chunk.toString('utf8');

  const matches = data.matchAll(/Content-Length: (\d+)\r\n\r\n/g);

  const messages = [];

  for (const match of matches) {
    // 'header' is the everything that matched in the regexp, i.e.: "Content-Length: <number>\r\n\r\n"
    const header = match[0];

    // 'offset' is the index (in the string) of the first character of the match, i.e. 'C' in 'Content-Length: ...'
    const offset = match.index;

    // 'start' is where the JSON message body starts
    const start = offset + header.length;

    // 'contentLength' is the <number> in "Content-Length: <number>\r\n\r\n"
    const contentLength = Number(match[1]);

    const message = JSON.parse(data.slice(start, start + contentLength));

    messages.push(message);
  }

  return messages;
}

export class TsServer {
  private _seq: number = 0;
  private readonly process: ChildProcess;

  private resolvers: Record<number, (value: any) => void> = {};

  constructor(process: ChildProcess) {
    this.process = process;

    this.process.stdout?.on('data', (buffer) => {
      const messages = parseTsServerMessages(buffer);

      for (const message of messages) {
        if (message.type === 'response') {
          const resolve = this.resolvers[message.request_seq];
          if (!resolve) {
            throw new Error(
              `No resolver found for request_seq ${message.request_seq}. This is a bug in the code.`,
            );
          }
          delete this.resolvers[message.request_seq];
          resolve(message);
        }

        if (message.type === 'event') {
          // Ignore telemetry events for now.
        }
      }
    });
  }

  private get seq() {
    return this._seq++;
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
   * Explicitly open a file in tsservrer.
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
   * Inform tsserver the file has changed.
   *
   * This is used to update tsserver's knowledge of a file's source when its source changes.
   */
  change(args: tsserver.protocol.ChangeRequestArgs) {
    return this.send({
      seq: this.seq,
      type: 'request',
      command: 'change',
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

export class TsServers {
  private servers: Record<string, TsServer> = {};

  get(id: string) {
    return this.servers[id];
  }

  set(id: string, server: TsServer) {
    if (this.servers[id]) {
      throw new Error(`tsserver for ${id} already exists. This is a bug in the code.`);
    }

    this.servers[id] = server;
  }

  has(id: string) {
    return this.get(id) !== undefined;
  }

  del(id: string) {
    delete this.servers[id];
  }

  create(id: string, options: { cwd: string }) {
    if (this.has(id)) {
      throw new Error(`tsserver for ${id} already exists. This is a bug in the code.`);
    }

    const child = spawn('npx', ['tsserver'], {
      cwd: options.cwd,
    });

    const server = new TsServer(child);

    this.set(id, server);

    child.on('exit', () => {
      this.del(id);
    });

    return server;
  }

  shutdown(id: string) {
    const server = this.get(id);

    if (!server) {
      throw new Error(`tsserver for ${id} does not exist. This is a bug in the code.`);
    }

    // The server is removed from this.servers in the
    // process exit handler which covers all exit cases.
    return server.shutdown();
  }
}

export default new TsServers();
