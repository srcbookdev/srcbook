import { z } from 'zod';
import { getConfig, updateConfig } from '../config.mjs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SRCBOOK_DIR } from '../constants.mjs';

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

// When running in a container, the config file is at /app/srcbook_mcp_config.json
const CONFIG_PATH = process.env.CONTAINER === 'true' 
  ? '/app/srcbook_mcp_config.json'
  : path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json');

export async function loadMcpConfig(): Promise<McpConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    // Try to read from the file first
    const fileContent = await fs.readFile(CONFIG_PATH, 'utf-8');
    const parsed = McpConfigSchema.safeParse(JSON.parse(fileContent));
    
    if (parsed.success) {
      cachedConfig = parsed.data;
      return cachedConfig;
    }
  } catch (error) {
    // File doesn't exist or is invalid, fall back to database
    console.log('MCP config file not found or invalid, using database config');
  }

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
  
  // Write to file for future use
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
  
  return cachedConfig;
}

export async function updateMcpConfig(newConfig: Partial<McpConfig>) {
  // Clear cache to force reload on next access
  cachedConfig = null;
  
  // Update the file
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
  
  // Update the database
  await updateConfig({ mcpServers: newConfig.mcpServers });
}