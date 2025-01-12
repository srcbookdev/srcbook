import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadMcpConfig } from './config.mjs';
import { z } from 'zod';

// Define TypeScript interfaces for strong typing
interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

/**
 * Tracks the status of each MCP server, including the underlying transport.
 */
interface McpConnection {
  client: Client;
  transport: StdioClientTransport;
  status: 'connected' | 'connecting' | 'disconnected';
  error?: string;
}

export class MCPHub {
  private connections = new Map<string, McpConnection>();
  private statusListeners: Array<
    (name: string, status: Omit<McpConnection, 'client' | 'transport'>) => void
  > = [];
  private initialized = false;
  private config!: McpConfig; // Use definite assignment assertion

  /**
   * Initialize the MCPHub and connect to all configured servers.
   * Should be called once during application startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('MCPHub already initialized');
    }

    this.config = await loadMcpConfig();
    if (!this.config.mcpServers) {
      this.initialized = true;
      return;
    }

    try {
      console.log('Initializing MCPHub with the following servers:', Object.keys(this.config.mcpServers));

      // Connect to all servers in parallel
      await Promise.all(
        Object.entries(this.config.mcpServers).map(([name]) =>
          this.connectServer(name).catch((error) => {
            console.error(`Failed to connect to server ${name}:`, error);
          }),
        ),
      );
    } finally {
      this.initialized = true;
    }
  }

  /**
   * Creates a new connection to a server, storing references to each transport/client.
   */
  private async connectServer(name: string): Promise<void> {
    // If already connected, remove old connection first
    if (this.connections.has(name)) {
      console.log(`Disconnecting from existing server: ${name}`);
      await this.disconnectServer(name);
    }

    const client = new Client(
      {
        name: "Srcbook",
        version: "1.0.0"
      },
      {
        capabilities: {}
      }
    );

    const serverConfig = this.config.mcpServers[name];
    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${name}`);
    }

    // Merge server-specific env with filteredEnv
    const filteredEnv: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter(([_, val]) => val !== undefined)
    ) as Record<string, string>;

    const mergedEnv = {
      ...filteredEnv,
      ...(serverConfig.env || {})
    };

    const transport = new StdioClientTransport({
      command: serverConfig.command, // Use command from config
      args: serverConfig.args,       // Use args from config
      env: mergedEnv,
      stderr: "pipe"
    });

    // Initialize connection in 'connecting' state
    const conn: McpConnection = {
      client,
      transport,
      status: "connecting"
    };
    this.connections.set(name, conn);
    this.notifyStatusChange(name, conn);

    // Register events
    transport.onerror = async (error) => {
      if (conn.status !== "disconnected") {
        conn.status = "disconnected";
        conn.error = error.message;
        this.notifyStatusChange(name, conn);
        console.error(`Transport error for server ${name}:`, error.message);
      }
    };

    transport.onclose = async () => {
      if (conn.status !== "disconnected") {
        conn.status = "disconnected";
        this.notifyStatusChange(name, conn);
        console.warn(`Transport closed for server ${name}`);
      }
    };

    try {
      console.log(`Attempting to connect to server: ${name}`);
      console.log(`Command: ${serverConfig.command} ${serverConfig.args!.join(' ')}`);
      console.log(`Environment Variables:`, serverConfig.env || {});

      if (transport.stderr) {
        transport.stderr.on("data", (data: Buffer) => {
          console.error(`[${name} stderr]: ${data.toString()}`);
        });
      }

      // Connect the client (this will start the transport)
      await client.connect(transport);
      console.log(`Successfully connected to server: ${name}`);
      conn.status = "connected";
      conn.error = undefined;
      this.notifyStatusChange(name, conn);

    } catch (err: any) {
      console.error(`Error connecting to server ${name}:`, err);
      conn.status = "disconnected";
      conn.error = err instanceof Error ? err.message : String(err);
      this.notifyStatusChange(name, conn);
      throw err;
    }
  }

  /**
   * Disconnect from a server and clean up references.
   */
  private async disconnectServer(name: string): Promise<void> {
    if (!this.connections.has(name)) {
      return;
    }
    const conn = this.connections.get(name);
    if (!conn) return;

    try {
      await conn.transport.close();
      await conn.client.close();
      console.log(`Disconnected from server: ${name}`);
    } catch (error) {
      console.error(`Error disconnecting from server ${name}:`, error);
    }
    this.connections.delete(name);
  }

  /**
   * Call a tool on a connected server.
   */
  async callTool(
    serverName: string,
    toolName: string,
    params: any,
  ): Promise<z.infer<typeof CallToolResultSchema>> {
    const conn = this.connections.get(serverName);
    if (!conn || conn.status !== 'connected') {
      throw new Error(`Server ${serverName} not connected`);
    }
    return conn.client.request(
      { method: 'tools/call', params: { name: toolName, arguments: params } },
      CallToolResultSchema,
    );
  }

  /**
   * List available tools on a connected server.
   */
  async listTools(serverName: string): Promise<z.infer<typeof ListToolsResultSchema>['tools']> {
    const conn = this.connections.get(serverName);
    if (!conn || conn.status !== 'connected') {
      return [];
    }
    try {
      const response = await conn.client.request({ method: 'tools/list' }, ListToolsResultSchema);
      return response.tools || [];
    } catch (error) {
      console.error(`Error listing tools on server ${serverName}:`, error);
      return [];
    }
  }

  /**
   * List available resources on a connected server.
   */
  async listResources(
    serverName: string,
  ): Promise<z.infer<typeof ListResourcesResultSchema>['resources']> {
    const conn = this.connections.get(serverName);
    if (!conn || conn.status !== 'connected') {
      return [];
    }
    try {
      const response = await conn.client.request(
        { method: 'resources/list' },
        ListResourcesResultSchema,
      );
      return response.resources || [];
    } catch (error) {
      console.error(`Error listing resources on server ${serverName}:`, error);
      return [];
    }
  }

  /**
   * List available resource templates on a connected server.
   */
  async listResourceTemplates(serverName: string): Promise<any[]> {
    const conn = this.connections.get(serverName);
    if (!conn || conn.status !== 'connected') {
      return [];
    }
    try {
      const response = await conn.client.request(
        { method: 'resources/templates/list' },
        ListResourceTemplatesResultSchema,
      );
      return response?.resourceTemplates || [];
    } catch (error) {
      console.error(`Error listing resource templates on server ${serverName}:`, error);
      return [];
    }
  }

  /**
   * Get status information about all connected servers.
   */
  listConnections(): Array<{ name: string; status: string; error?: string }> {
    return Array.from(this.connections.entries()).map(([name, conn]) => ({
      name,
      status: conn.status,
      error: conn.error,
    }));
  }

  /**
   * Get connection information for a specific server.
   */
  getConnection(name: string): McpConnection | undefined {
    return this.connections.get(name);
  }

  /**
   * Attempt to reconnect to a specific server using its current configuration.
   */
  async reconnectServer(name: string): Promise<void> {
    const serverConfig = this.config.mcpServers[name];

    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${name}`);
    }

    await this.connectServer(name);
  }

  /**
   * Register a listener for server status changes.
   */
  onStatusChange(
    listener: (name: string, status: Omit<McpConnection, 'client' | 'transport'>) => void,
  ) {
    this.statusListeners.push(listener);
  }

  /**
   * Notify all registered listeners of a server status change.
   */
  private notifyStatusChange(name: string, conn: McpConnection) {
    const status = {
      status: conn.status,
      error: conn.error,
    };

    for (const listener of this.statusListeners) {
      listener(name, status);
    }
  }
}