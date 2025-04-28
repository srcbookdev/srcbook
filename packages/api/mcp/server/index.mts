/**
 * MCP Server Integration
 *
 * This module exports the MCP server manager and related utilities for
 * serving Srcbook's capabilities to MCP clients.
 */

export {
  MCPServerManager,
  getMCPServerManager,
  type MCPServerSettings,
} from './server-manager.mjs';

// Export a function to initialize the MCP server manager
export async function initializeMCPServer(): Promise<void> {
  const { getMCPServerManager } = await import('./server-manager.mjs');
  const serverManager = getMCPServerManager();
  await serverManager.initialize();
}

// Export a function to start the MCP server with stdio transport
export async function startMCPServerWithStdio(): Promise<void> {
  const { getMCPServerManager } = await import('./server-manager.mjs');
  const serverManager = getMCPServerManager();
  await serverManager.startWithStdio();
}

// Export a function to start the MCP server with SSE transport
export async function startMCPServerWithSSE(port: number, expressApp: any): Promise<void> {
  const { getMCPServerManager } = await import('./server-manager.mjs');
  const serverManager = getMCPServerManager();
  await serverManager.startWithSSE(port, expressApp);
}

// Export a function to stop the MCP server
export async function stopMCPServer(): Promise<void> {
  const { getMCPServerManager } = await import('./server-manager.mjs');
  const serverManager = getMCPServerManager();
  await serverManager.stop();
}
