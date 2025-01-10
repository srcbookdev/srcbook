import { z } from 'zod';

// Core MCP Schemas
export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.object({
      type: z.string(),
      description: z.string().optional()
    })),
    required: z.array(z.string()).optional()
  })
});

export const McpResourceSchema = z.object({
  uri: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional()
});

export const McpResourceTemplateSchema = z.object({
  uriTemplate: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional()
});

// Server Configuration Schema
export const McpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional()
});

// Runtime State Types
export const McpServerStatusSchema = z.object({
  name: z.string(),
  status: z.enum(['connected', 'connecting', 'disconnected']),
  config: z.string(), // JSON stringified config
  error: z.string().optional(),
  tools: z.array(McpToolSchema).optional(),
  resources: z.array(McpResourceSchema).optional(),
  resourceTemplates: z.array(McpResourceTemplateSchema).optional()
});

export const McpErrorSchema = z.object({
    code: z.string().or(z.number()).optional(),
    message: z.string(),
    details: z.record(z.any()).optional(),
});

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

// Export TypeScript types
export type McpTool = z.infer<typeof McpToolSchema>;
export type McpResource = z.infer<typeof McpResourceSchema>;
export type McpResourceTemplate = z.infer<typeof McpResourceTemplateSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type McpServerStatus = z.infer<typeof McpServerStatusSchema>;
export type McpError = z.infer<typeof McpErrorSchema>;

// WebSocket Event Payloads
export const McpServerConnectionPayloadSchema = z.object({
  name: z.string()
});

export const McpServerStatusUpdatePayloadSchema = McpServerStatusSchema;

export const McpToolResultPayloadSchema = z.object({
  toolId: z.string(),
  result: z.any()
});

export type McpServerConnectionPayload = z.infer<typeof McpServerConnectionPayloadSchema>;
export type McpServerStatusUpdatePayload = z.infer<typeof McpServerStatusUpdatePayloadSchema>;
export type McpToolResultPayload = z.infer<typeof McpToolResultPayloadSchema>;