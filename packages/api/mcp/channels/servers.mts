import WebSocketServer from '../../server/ws-client.mjs';
import MCPHub from '../../mcp/mcphub.mjs';
import { 
  McpServerConnectionPayloadSchema,
} from '../types/index.mjs';
import { z } from 'zod';

async function gatherServerStatus(mcpHub: typeof MCPHub, name: string, status: string, error?: string) {
  console.log(`Gathering status for server: ${name}, Status: ${status}`);

  let tools;
  let resources;
  let resourceTemplates;

  if (status === 'connected') {
    try {
      tools = await mcpHub.listTools(name);
      console.log(`Tools for server ${name}:`, tools);
    } catch (err) {
      console.error(`Failed to list tools for server ${name}:`, err);
    }

    try {
      resources = await mcpHub.listResources(name);
      console.log(`Resources for server ${name}:`, resources);
    } catch (err) {
      console.error(`Failed to list resources for server ${name}:`, err);
    }

    try {
      resourceTemplates = await mcpHub.listResourceTemplates(name);
      console.log(`Resource Templates for server ${name}:`, resourceTemplates);
    } catch (err) {
      console.error(`Failed to list resource templates for server ${name}:`, err);
    }
  }

  return {
    name,
    status,
    error,
    tools,
    resources,
    resourceTemplates
  };
}

export function register(wss: WebSocketServer, mcpHub: typeof MCPHub) {
  wss
    .channel('mcp:servers')
    // Get status of all servers
    .on('servers:list', z.object({}), async (_payload, _context, conn) => {
      try {
        const servers = await Promise.all(
          mcpHub.listConnections().map(async serverConn => 
            gatherServerStatus(mcpHub, serverConn.name, serverConn.status, serverConn.error)
          )
        );
        console.log('Servers list response:', servers);
        conn.reply('mcp:servers', 'servers:list:response', { servers });
      } catch (error) {
        console.error('Error in servers:list handler:', error);
        conn.reply('mcp:servers', 'servers:list:error', { error: error.message });
      }
    })
    // Request status update for specific server  
    .on('server:status', McpServerConnectionPayloadSchema, async (payload, _context, conn) => {
      try {
        const serverConn = mcpHub.getConnection(payload.name);
        if (!serverConn) {
          conn.reply('mcp:servers', 'server:error', {
            name: payload.name,
            error: 'Server not found'
          });
          return;
        }

        const status = await gatherServerStatus(
          mcpHub,
          payload.name,
          serverConn.status,
          serverConn.error
        );

        console.log(`Server status response for ${payload.name}:`, status);
        conn.reply('mcp:servers', 'server:status:response', { status });
      } catch (error) {
        console.error('Error in server:status handler:', error);
        conn.reply('mcp:servers', 'server:status:error', { error: error.message });
      }
    })
    // Request server reconnection
    .on('server:reconnect', McpServerConnectionPayloadSchema, async (payload, _context, conn) => {
      try {
        console.log(`Attempting to reconnect to server ${payload.name}...`);
        await mcpHub.reconnectServer(payload.name);
        conn.reply('mcp:servers', 'server:reconnect:success', { name: payload.name });
      } catch (error) {
        console.error(`Failed to reconnect to server ${payload.name}:`, error);
        conn.reply('mcp:servers', 'server:error', {
          name: payload.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

  // Add server status change handler to broadcast updates
  mcpHub.onStatusChange(async (name, status) => {
    try {
      const fullStatus = await gatherServerStatus(
        mcpHub, 
        name, 
        status.status, 
        status.error
      );
      console.log(`Broadcasting status change for server ${name}:`, fullStatus);
      wss.broadcast('mcp:servers', 'server:status:changed', { status: fullStatus });
    } catch (error) {
      console.error(`Error broadcasting status change for server ${name}:`, error);
    }
  });
}