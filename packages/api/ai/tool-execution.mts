import { MCPHub } from '../mcp/mcphub.mjs';
import type { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { CallToolRequestSchema } from '../mcp/types.mjs';
import { z } from 'zod';

export class ToolExecutionService {
  constructor(private mcpHub: MCPHub) {}

  async executeToolStream(request: z.infer<typeof CallToolRequestSchema>): Promise<ReadableStream> {
    return new ReadableStream({
      start: async (controller) => {
        try {
          const result: z.infer<typeof CallToolResultSchema> = await this.mcpHub.callTool(
            request.serverName,
            request.toolName,
            request.params
          );

          controller.enqueue(
            JSON.stringify({
              type: 'result',
              data: result,
            }) + '\n'
          );

          controller.close();
        } catch (error: any) {
          controller.enqueue(
            JSON.stringify({
              type: 'error',
              data: { message: error.message },
            }) + '\n'
          );
          controller.error(error);
        }
      },
    });
  }
}