import { spawn } from 'child_process';
import { TsServer } from './tsserver.mjs';

/**
 * This object is responsible for managing multiple tsserver instances.
 */
export class TsServers {
  private servers: Record<string, TsServer> = {};

  get(id: string) {
    const server = this.servers[id];

    if (!server) {
      throw new Error(`tsserver for ${id} does not exist.`);
    }

    return server;
  }

  set(id: string, server: TsServer) {
    if (this.servers[id]) {
      throw new Error(`tsserver for ${id} already exists.`);
    }

    this.servers[id] = server;
  }

  has(id: string) {
    return this.servers[id] !== undefined;
  }

  del(id: string) {
    delete this.servers[id];
  }

  create(id: string, options: { cwd: string }) {
    if (this.has(id)) {
      throw new Error(`tsserver for ${id} already exists.`);
    }

    // This is using the TypeScript dependency in the user's Srcbook.
    //
    // Note: If a user creates a typescript Srcbook, when it is first
    // created, the dependencies are not installed and thus this will
    // shut down immediately. Make sure that we handle this case after
    // package.json has finished installing its deps.

    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    const child = spawn(npxCmd, ['tsserver'], {
      cwd: options.cwd,
      shell: process.platform === 'win32',
    });

    const server = new TsServer(child);

    this.set(id, server);

    child.on('exit', () => {
      this.del(id);
    });

    return server;
  }

  shutdown(id: string) {
    if (!this.has(id)) {
      console.warn(`tsserver for ${id} does not exist. Skipping shutdown.`);
      return;
    }

    // The server is removed from this.servers in the
    // process exit handler which covers all exit cases.
    return this.get(id).shutdown();
  }
}
