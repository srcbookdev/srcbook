import { z } from 'zod';
import { getConfig, updateConfig } from '../config.mjs';

// Union-based approach with a mandatory "type" field
export const McpServerConfigSchema = z.object({
  host: z.string().url(),
  tools: z.array(z.string()).optional(),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

const McpConfigSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema).optional(),
});

type McpConfig = z.infer<typeof McpConfigSchema>;

let cachedConfig: McpConfig | null = null;

export async function loadMcpConfig(): Promise<McpConfig> {
  if (cachedConfig) return cachedConfig;

  const config = await getConfig();
  
  // Extract MCP config from the main config
  // If no MCP config exists yet, initialize with empty servers
  const mcpConfig = {
    mcpServers: config.mcpServers || {}
  };
  
  const parsed = McpConfigSchema.safeParse(mcpConfig);

  if (!parsed.success) {
    throw new Error('Invalid MCP configuration: ' + JSON.stringify(parsed.error.errors));
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export async function updateMcpConfig(newConfig: Partial<McpConfig>) {
  // Clear cache to force reload on next access
  cachedConfig = null;
  
  // Update only the MCP-related portion of the main config
  await updateConfig({ mcpServers: newConfig.mcpServers });
}