/**
 * MCP Server Manager
 *
 * This module manages MCP server instances, handling initialization,
 * tool registration, and connection management.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { posthog } from '../../posthog-client.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import tools
import { registerGenerateAppTool } from './tools/generate-app.mjs';
import { registerUIVisualizeTool } from './tools/ui-visualize.mjs';

// Define types for MCP server configuration
export const MCPServerSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().optional(),
  allowRemoteConnections: z.boolean().default(false),
  authToken: z.string().optional(),
});

export type MCPServerSettings = z.infer<typeof MCPServerSettingsSchema>;

/**
 * MCP Server Manager class
 *
 * Manages MCP server instances and handles connections.
 */
export class MCPServerManager {
  private server: McpServer | null = null;
  private settings: MCPServerSettings;
  private configPath: string;
  private _isInitialized = false;
  private _isRunning = false;

  /**
   * Check if the server manager is initialized
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Check if the server is running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Create a new MCP Server Manager
   * @param configPath Path to the MCP configuration file
   */
  constructor(configPath: string) {
    this.configPath = configPath;
    this.settings = {
      enabled: true,
      allowRemoteConnections: false,
    };
  }

  /**
   * Initialize the MCP Server Manager
   * Loads the configuration and sets up the server
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      // Load and parse the configuration
      await this.loadConfig();

      if (!this.settings.enabled) {
        console.log('MCP server is disabled in configuration. Server will not start.');
        return;
      }

      // Create the MCP server
      this.server = new McpServer({
        name: 'srcbook-mcp-server',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {}
        }
      });

      // Register tools
      this.registerTools();

      this._isInitialized = true;
      console.log('MCP Server Manager initialized.');

      posthog.capture({
        event: 'mcp_server_manager_initialized',
      });
    } catch (error) {
      console.error('Failed to initialize MCP Server Manager:', error);
      throw error;
    }
  }

  /**
   * Load the MCP server configuration from the specified file
   */
  private async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      // Check if server settings exist in the config
      if (parsedConfig.mcpServer) {
        // Validate the configuration
        const result = MCPServerSettingsSchema.safeParse(parsedConfig.mcpServer);

        if (result.success) {
          this.settings = result.data;
        } else {
          console.error('Invalid MCP server configuration:', result.error);
          // Use default settings
        }
      } else {
        console.log('No MCP server configuration found. Using default settings.');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`MCP configuration file not found at ${this.configPath}`);
        return;
      }

      console.error('Error loading MCP server configuration:', error);
      throw error;
    }
  }

  /**
   * Register tools with the MCP server
   */
  private registerTools(): void {
    if (!this.server) {
      throw new Error('Cannot register tools: MCP server not initialized');
    }

    // Register available tools
    registerGenerateAppTool(this.server);
    registerUIVisualizeTool(this.server);

    console.log('Registered MCP server tools.');
  }

  /**
   * Start the MCP server with stdio transport
   * This is used for local connections
   */
  async startWithStdio(): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    if (!this.server) {
      throw new Error('Cannot start server: MCP server not initialized');
    }

    if (this._isRunning) {
      console.log('MCP server is already running.');
      return;
    }

    try {
      // Create a stdio transport
      const transport = new StdioServerTransport();

      // Connect the server to the transport
      await this.server.connect(transport);

      this._isRunning = true;
      console.log('MCP server started with stdio transport.');

      posthog.capture({
        event: 'mcp_server_started',
        properties: { transport: 'stdio' },
      });
    } catch (error) {
      console.error('Failed to start MCP server with stdio transport:', error);
      throw error;
    }
  }

  /**
   * Start the MCP server with SSE transport
   * This is used for remote connections
   * @param port The port to listen on
   * @param expressApp The Express app to use
   */
  async startWithSSE(port: number, expressApp: any): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    if (!this.server) {
      throw new Error('Cannot start server: MCP server not initialized');
    }

    if (!this.settings.allowRemoteConnections) {
      console.warn('Remote connections are disabled in configuration. SSE transport will not start.');
      return;
    }

    if (this._isRunning) {
      console.log('MCP server is already running.');
      return;
    }

    try {
      // Set up SSE endpoint
      expressApp.get('/mcp/sse', async (req: any, res: any) => {
        // Check authentication if required
        if (this.settings.authToken && req.headers.authorization !== `Bearer ${this.settings.authToken}`) {
          res.status(401).send('Unauthorized');
          return;
        }

        // Create a transport
        const transport = new SSEServerTransport('/mcp/messages', res);

        // Connect the server to the transport
        await this.server!.connect(transport);

        // Store the transport instance for later use
        expressApp.locals.mcpTransport = transport;
      });

      // Set up message endpoint
      expressApp.post('/mcp/messages', async (req: any, res: any) => {
        // Check authentication if required
        if (this.settings.authToken && req.headers.authorization !== `Bearer ${this.settings.authToken}`) {
          res.status(401).send('Unauthorized');
          return;
        }

        const transport = expressApp.locals.mcpTransport;
        if (!transport) {
          res.status(400).send('No active MCP connection');
          return;
        }

        await transport.handlePostMessage(req, res);
      });

      this._isRunning = true;
      console.log(`MCP server started with SSE transport on port ${port}.`);

      posthog.capture({
        event: 'mcp_server_started',
        properties: { transport: 'sse', port },
      });
    } catch (error) {
      console.error('Failed to start MCP server with SSE transport:', error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this._isRunning || !this.server) {
      return;
    }

    try {
      // Close the server
      await this.server.close();

      this._isRunning = false;
      console.log('MCP server stopped.');

      posthog.capture({
        event: 'mcp_server_stopped',
      });
    } catch (error) {
      console.error('Failed to stop MCP server:', error);
      throw error;
    }
  }
}

// Create a singleton instance of the MCP Server Manager
let serverManagerInstance: MCPServerManager | null = null;

/**
 * Get the singleton instance of the MCP Server Manager
 * @param configPath Optional path to the MCP configuration file
 * @returns The MCP Server Manager instance
 */
export function getMCPServerManager(configPath?: string): MCPServerManager {
  if (!serverManagerInstance) {
    // Use a relative path from the current file to the config file
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    const defaultConfigPath = path.resolve(currentDir, '../../srcbook_mcp_config.json');
    console.log(`Using MCP config path for server: ${defaultConfigPath}`);
    serverManagerInstance = new MCPServerManager(configPath || defaultConfigPath);
  }

  return serverManagerInstance;
}
