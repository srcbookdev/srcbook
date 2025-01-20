import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  InitializeResultSchema, // ✅ Ensure this is correctly imported
} from '@modelcontextprotocol/sdk/types.js';
import { loadMcpConfig } from './config.mjs';
import { z } from 'zod';

// Define TypeScript interfaces for strong typing
interface ClientInfo {
  name: string;
  version: string;
  description?: string;
}

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

interface McpConnection {
  client: Client;
  transport: StdioClientTransport;
  status: 'connected' | 'connecting' | 'disconnected';
  capabilities: ServerCapabilities;
  error?: string;
}

interface ServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  resourceTemplates?: boolean;
  // Add other capabilities as needed
}

class MCPHub {
  private connections = new Map<string, McpConnection>();
  private statusListeners: Array<
    (name: string, status: Omit<McpConnection, 'client' | 'transport'>) => void
  > = [];
  private initialized = false;
  private config!: McpConfig;

  private static instance: MCPHub;

  private constructor() {
    console.log('Creating new MCPHub instance.');
  }

  public static getInstance(): MCPHub {
    if (!MCPHub.instance) {
      MCPHub.instance = new MCPHub();
    } else {
      console.log('Returning existing MCPHub instance.');
    }
    return MCPHub.instance;
  }

  /**
   * Initialize the MCPHub and connect to all configured servers.
   * Should be called once during application startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('MCPHub already initialized.');
      return;
    }

    this.config = await loadMcpConfig();
    if (!this.config.mcpServers) {
      this.initialized = true;
      console.warn('No MCP servers configured.');
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
      console.log('MCPHub initialization complete.');
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
      status: "connecting",
      capabilities: {}
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
        conn.error = 'Transport closed unexpectedly.';
        this.notifyStatusChange(name, conn);
        console.warn(`Transport closed for server ${name}`);
      }
    };

    try {
      console.log(`Attempting to connect to server: ${name}`);
      console.log(`Command: ${serverConfig.command} ${serverConfig.args ? serverConfig.args.join(' ') : ''}`);
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

      // Define clientInfo
      const clientInfo: ClientInfo = {
        name: "Srcbook",
        version: "1.0.0",
        description: "Srcbook MCP Client",
      };

      // Parse server capabilities from the initialize response
      const initializeResponse = await client.request(
        {
          method: 'initialize',
          params: {
            protocolVersion: '1.0',
            capabilities: {},
            clientInfo, // ✅ Included clientInfo
          }
        },
        InitializeResultSchema // Ensure this schema matches the server response
      );

      if (initializeResponse && initializeResponse.capabilities) {
        conn.capabilities = {
          tools: !!initializeResponse.capabilities.tools,
          resources: !!initializeResponse.capabilities.resources,
          resourceTemplates: !!initializeResponse.capabilities.resourceTemplates
        };
        console.log(`Server ${name} capabilities:`, conn.capabilities);
      } else {
        console.warn(`No capabilities received from server ${name}.`);
      }

      // Conditionally list tools and resources based on dynamic capabilities
      if (conn.capabilities.tools) {
        try {
          const tools = await this.listTools(name);
          console.log(`Tools on server ${name}:`, tools);
        } catch (error) {
          console.error(`Error listing tools on server ${name}:`, error);
        }
      }

      if (conn.capabilities.resources) {
        try {
          const resources = await this.listResources(name);
          console.log(`Resources on server ${name}:`, resources);
        } catch (error) {
          console.error(`Error listing resources on server ${name}:`, error);
        }
      }

      if (conn.capabilities.resourceTemplates) {
        try {
          const resourceTemplates = await this.listResourceTemplates(name);
          console.log(`Resource Templates on server ${name}:`, resourceTemplates);
        } catch (error) {
          console.error(`Error listing resource templates on server ${name}:`, error);
        }
      }

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
      console.warn(`Cannot list tools. Server ${serverName} is not connected.`);
      return [];
    }

    if (!conn.capabilities.tools) {
      console.log(`Server ${serverName} does not support tools. Skipping tools listing.`);
      return [];
    }

    console.log(`Requesting tools list from server ${serverName}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000); // 5-second timeout

    try {
      const response = await conn.client.request(
        { method: "tools/list" },
        ListToolsResultSchema
      );
      clearTimeout(timeout);
      console.log(`Received tools list from server ${serverName}:`, response.tools);
      return response.tools || [];
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error(`Timeout while listing tools on server ${serverName}.`);
      } else {
        console.error(`Error listing tools on server ${serverName}:`, error);
      }
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

    if (!conn.capabilities.resources) {
      console.log(`Server ${serverName} does not support resources. Skipping resources listing.`);
      return [];
    }

    try {
      const response = await conn.client.request(
        { method: 'resources/list' },
        ListResourcesResultSchema,
      );
      return response.resources || [];
    } catch (error: any) {
      if (error.code === -32601) { // Method not found
        console.warn(`Method 'resources/list' not found on server ${serverName}.`);
      } else {
        console.error(`Error listing resources on server ${serverName}:`, error);
      }
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

    if (!conn.capabilities.resourceTemplates) {
      console.log(`Server ${serverName} does not support resource templates. Skipping.`);
      return [];
    }

    try {
      const response = await conn.client.request(
        { method: 'resources/templates/list' },
        ListResourceTemplatesResultSchema,
      );
      return response?.resourceTemplates || [];
    } catch (error: any) {
      if (error.code === -32601) { // Method not found
        console.warn(`Method 'resources/templates/list' not found on server ${serverName}.`);
      } else {
        console.error(`Error listing resource templates on server ${serverName}:`, error);
      }
      return [];
    }
  }

  /**
   * Get status information about all connected servers.
   */
  listConnections(): Array<{ 
    name: string; 
    status: string; 
    capabilities: ServerCapabilities; 
    error?: string 
  }> {
    return Array.from(this.connections.entries()).map(([name, conn]) => ({
      name,
      status: conn.status,
      capabilities: conn.capabilities,
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
      name,
      status: conn.status,
      error: conn.error,
      capabilities: conn.capabilities
    };

    for (const listener of this.statusListeners) {
      listener(name, status);
    }
  }
}

const mcpHubInstance = MCPHub.getInstance(); // ✅ Use getInstance
export default mcpHubInstance;