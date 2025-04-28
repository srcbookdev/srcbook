#!/usr/bin/env node

/**
 * Test client for the Srcbook MCP server
 * 
 * This script connects to the Srcbook MCP server and calls the generate-app tool.
 * It's useful for testing the server functionality.
 * 
 * Usage:
 *   npx tsx packages/api/mcp/server/test-client.mts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function main() {
  console.log('Starting MCP test client...');

  try {
    // Create a new client
    const client = new Client(
      { name: 'srcbook-mcp-test-client', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    // Get the path to the server script
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFilePath);
    const serverScript = path.resolve(currentDir, '../../../dist/mcp/server/test-server.mjs');

    console.log(`Connecting to MCP server at: ${serverScript}`);

    // Create a transport
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverScript],
    });

    // Connect to the server
    await client.connect(transport);
    console.log('Connected to MCP server');

    // List available tools
    // @ts-ignore - TypeScript doesn't recognize the listTools method
    const toolsResult = await client.listTools();
    console.log('Available tools:', toolsResult.tools.map(t => t.name));

    // Call the generate-app tool
    console.log('Calling generate-app tool...');
    // @ts-ignore - TypeScript doesn't recognize the callTool method signature correctly
    const result = await client.callTool('generate-app', {
      query: 'Create a simple counter app with React',
      projectName: 'counter-app',
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    // Close the connection
    await client.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
