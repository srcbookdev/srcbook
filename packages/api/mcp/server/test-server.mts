#!/usr/bin/env node

/**
 * Test server for the Srcbook MCP server
 *
 * This script starts the Srcbook MCP server in standalone mode for testing.
 *
 * Usage:
 *   npx tsx packages/api/mcp/server/test-server.mts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerGenerateAppTool } from './tools/generate-app.mjs';

async function main() {
  try {
    // Create an MCP server instance
    const server = new McpServer({
      name: 'srcbook-mcp-test-server',
      version: '1.0.0',
    });

    // Register the generate app tool
    registerGenerateAppTool(server);

    // Create a transport (stdio for this example)
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    console.error('MCP server started with stdio transport');
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
