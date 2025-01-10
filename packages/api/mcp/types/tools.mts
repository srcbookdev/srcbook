import { z } from 'zod';

export const MCPToolExecutionSchema = z.object({
  // The name of the MCP server to use (must match a server in config)
  serverName: z.string(),
  
  // The name of the tool to execute (e.g., "scrapeWebpage")
  toolName: z.string(),
  
  // Tool-specific parameters passed directly to the tool
  // Using record() allows for flexible parameter structures
  params: z.record(z.any())
});

// Type inference for TypeScript
export type MCPToolExecution = z.infer<typeof MCPToolExecutionSchema>;