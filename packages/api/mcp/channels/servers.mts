import WebSocketServer from '../../server/ws-client.mjs';
import { MCPHub } from '../mcphub.mjs';
import { 
  McpServerConnectionPayloadSchema,
} from '../types/index.mjs';
import { z } from 'zod';

async function gatherServerStatus(mcpHub: MCPHub, name: string, status: string, error?: string) {
    return {
      name,
      status,
      error,
      tools: status === 'connected' ? await mcpHub.listTools(name) : undefined,
      resources: status === 'connected' ? await mcpHub.listResources(name) : undefined,
      resourceTemplates: status === 'connected' ? 
        await mcpHub.listResourceTemplates(name) : undefined
    };
  }

  export function register(wss: WebSocketServer, mcpHub: MCPHub) {
    wss
      .channel('mcp:servers')
      // Get status of all servers
      .on('servers:list', z.object({}), async (_payload, _context, conn) => {
        const servers = await Promise.all(
          mcpHub.listConnections().map(async serverConn => 
            gatherServerStatus(mcpHub, serverConn.name, serverConn.status, serverConn.error)
          )
        );
  
        conn.reply('mcp:servers', 'servers:list:response', { servers });
      })
      // Request status update for specific server  
      .on('server:status', McpServerConnectionPayloadSchema, async (payload, _context, conn) => {
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
  
        conn.reply('mcp:servers', 'server:status:response', { status });
      })
      // Request server reconnection
      .on('server:reconnect', McpServerConnectionPayloadSchema, async (payload, _context, conn) => {
        try {
          await mcpHub.reconnectServer(payload.name);
          // Status update will be broadcast via the status change handler
        } catch (error) {
          conn.reply('mcp:servers', 'server:error', {
            name: payload.name,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
  
    // Add server status change handler to broadcast updates
    mcpHub.onStatusChange(async (name, status) => {
      const fullStatus = await gatherServerStatus(
        mcpHub, 
        name, 
        status.status, 
        status.error
      );
      
      wss.broadcast('mcp:servers', 'server:status:changed', { status: fullStatus });
    });
  }