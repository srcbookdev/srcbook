import { z } from 'zod';

export const CallToolRequestSchema = z.object({
  serverName: z.string(),
  toolName: z.string(),
  params: z.object({
    name: z.string(),
    _meta: z.object({
      progressToken: z.union([z.string(), z.number()]).optional(),
    }).optional(),
    arguments: z.record(z.any()).optional(),
  }),
  method: z.literal('tools/call'),
}); 