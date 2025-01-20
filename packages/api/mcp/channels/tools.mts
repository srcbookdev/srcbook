import WebSocketServer from '../../server/ws-client.mjs';
import mcpHubInstance from '../../mcp/mcphub.mjs';
import { MCPToolExecutionSchema } from '../types/tools.mjs';
import { z } from 'zod';

/**
 * Registers WebSocket channels for MCP tool execution and management
 * @param wss WebSocket server instance
 * @param mcpHub MCP hub instance for tool execution
 */
export function register(wss: WebSocketServer, mcpHub: typeof mcpHubInstance) {
  wss
    // Create a dynamic channel based on toolId parameter
    .channel('tool:<toolId>')
    // Listen for tool execution requests
    .on('tool:execute', MCPToolExecutionSchema, async (payload, context, conn) => {
      const toolSchema = knownToolSchemas[payload.toolName];
      if (toolSchema) {
        const validatedParams = toolSchema.parse(payload.params);
        const result = await mcpHub.callTool(
          payload.serverName,
          payload.toolName,
          validatedParams
        );
        conn.reply(`tool:${context.params.toolId}`, 'tool:result', { result });
      } else {
        // handle unknown tool
        conn.reply(`tool:${context.params.toolId}`, 'tool:error', {
          error: `No schema found for tool '${payload.toolName}'`,
        });
      }
    });
}

// For demonstration, each tool might have a corresponding Zod schema
const knownToolSchemas: Record<string, z.ZodType<any>> = {
  scrapeWebpage: z.object({
    url: z.string().url(),
    maxDepth: z.number().optional(),
  }),
  // ...
};