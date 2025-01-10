import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
 CallToolResultSchema,
 ListToolsResultSchema,
 ListResourcesResultSchema,
 ListResourceTemplatesResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import { loadMcpConfig } from "./config.mjs";
import { z } from 'zod';

/**
* Tracks the status of each MCP server, including the underlying transport.
*/
interface McpConnection {
 client: Client;
 transport: StdioClientTransport;
 status: "connected" | "connecting" | "disconnected";
 error?: string;
}

export class MCPHub {
 private connections = new Map<string, McpConnection>();
 private statusListeners: Array<(name: string, status: Omit<McpConnection, 'client' | 'transport'>) => void> = [];
 private initialized = false;

 /**
  * Initialize the MCPHub and connect to all configured servers.
  * Should be called once during application startup.
  */
 async initialize(): Promise<void> {
   if (this.initialized) {
     throw new Error('MCPHub already initialized');
   }

   const config = await loadMcpConfig();
   if (!config.mcpServers) {
     this.initialized = true;
     return;
   }

   try {
     // Connect to all servers in parallel
     await Promise.all(
       Object.entries(config.mcpServers).map(([name]) => 
         this.connectServer(name).catch(error => {
           console.error(`Failed to connect to server ${name}:`, error);
         })
       )
     );
   } finally {
     this.initialized = true;
   }
 }

 /**
  * Creates a new connection to a server, storing references to each transport/client.
  * In this example, we assume a single host-based approach
  * with a placeholder StdioClientTransport that isn't truly local-based.
  */
 private async connectServer(name: string): Promise<void> {
   // If already connected, remove old connection first
   if (this.connections.has(name)) {
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

   // Filter process.env to satisfy Record<string, string> (no undefined values)
   const filteredEnv: Record<string, string> = Object.fromEntries(
     Object.entries(process.env).filter(([_, val]) => val !== undefined)
   ) as Record<string, string>;

   // For now, we ignore serverConfig.host in the transport settings (placeholder).
   const transport = new StdioClientTransport({
     command: "/usr/bin/env",
     args: [],
     env: filteredEnv,
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
     }
   };

   transport.onclose = async () => {
     if (conn.status !== "disconnected") {
       conn.status = "disconnected";
       this.notifyStatusChange(name, conn);
     }
   };

   try {
     // Start the transport to capture stderr
     await transport.start();

     if (transport.stderr) {
       transport.stderr.on("data", (data: Buffer) => {
         console.error(`[${name} stderr]: ${data.toString()}`);
       });
     }

     // Connect the client
     await client.connect(transport);
     conn.status = "connected";
     conn.error = undefined;
     this.notifyStatusChange(name, conn);

   } catch (err: any) {
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
   } catch {
     // Optional: log disconnection errors
   }
   this.connections.delete(name);
 }

 /**
  * Call a tool on a connected server.
  */
 async callTool(serverName: string, toolName: string, params: any): Promise<z.infer<typeof CallToolResultSchema>> {
   const conn = this.connections.get(serverName);
   if (!conn || conn.status !== 'connected') {
     throw new Error(`Server ${serverName} not connected`);
   }
   return conn.client.request(
     { method: 'tools/call', params: { name: toolName, arguments: params } },
     CallToolResultSchema
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
     const response = await conn.client.request(
       { method: 'tools/list' },
       ListToolsResultSchema
     );
     return response.tools || [];
   } catch {
     return [];
   }
 }

 /**
  * List available resources on a connected server.
  */
 async listResources(serverName: string): Promise<z.infer<typeof ListResourcesResultSchema>['resources']> {
   const conn = this.connections.get(serverName);
   if (!conn || conn.status !== 'connected') {
     return [];
   }
   try {
     const response = await conn.client.request(
       { method: 'resources/list' },
       ListResourcesResultSchema
     );
     return response.resources || [];
   } catch {
     return [];
   }
 }

 /**
  * List available resource templates on a connected server.
  */
 async listResourceTemplates(serverName: string): Promise<any[]> {
   const conn = this.connections.get(serverName);
   if (!conn || conn.status !== "connected") {
     return [];
   }
   try {
     const response = await conn.client.request(
       { method: "resources/templates/list" },
       ListResourceTemplatesResultSchema
     );
     return response?.resourceTemplates || [];
   } catch {
     return [];
   }
 }

 /**
  * Get status information about all connected servers.
  */
 listConnections(): Array<{name: string, status: string, error?: string}> {
   return Array.from(this.connections.entries()).map(([name, conn]) => ({
     name,
     status: conn.status,
     error: conn.error
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
   const config = await loadMcpConfig();
   const serverConfig = config.mcpServers?.[name];
   
   if (!serverConfig) {
     throw new Error(`No configuration found for server: ${name}`);
   }
 
   await this.connectServer(name);
 }
 
 /**
  * Register a listener for server status changes.
  */
 onStatusChange(listener: (name: string, status: Omit<McpConnection, 'client' | 'transport'>) => void) {
   this.statusListeners.push(listener);
 }
 
 /**
  * Notify all registered listeners of a server status change.
  */
 private notifyStatusChange(name: string, conn: McpConnection) {
   const status = {
     status: conn.status,
     error: conn.error
   };
   
   for (const listener of this.statusListeners) {
     listener(name, status);
   }
 }
}