import { z } from 'zod';
import { getConfig, updateConfig } from '../config.mjs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { SRCBOOK_DIR } from '../constants.mjs';
import { McpServerConfigSchema } from './types/index.mjs';

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

const McpFileConfigSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema),
});

type McpConfig = z.infer<typeof McpFileConfigSchema>;

let cachedConfig: McpConfig | null = null;

// When running in a container, the config file is at /app/srcbook_mcp_config.json
const CONFIG_PATH =
  process.env.CONTAINER === 'true'
    ? '/app/srcbook_mcp_config.json'
    : path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json');

    export async function loadMcpConfig(): Promise<McpConfig> {
      if (cachedConfig) return cachedConfig;

      console.log('Environment:', {
        CONTAINER: process.env.CONTAINER,
        CONFIG_PATH,
        cwd: process.cwd()
      });

      try {
        // Try to read from the file first
        console.log('Attempting to read:', CONFIG_PATH);
        const fileContent = await fs.readFile(CONFIG_PATH, 'utf-8');
        console.log('Raw file content:', fileContent);

        let jsonContent: unknown;
        try {
          jsonContent = JSON.parse(fileContent);
          console.log('Parsed JSON:', jsonContent);
        } catch (e) {
          console.log('JSON parse error:', e);
          throw e;
        }


    const parsed = McpFileConfigSchema.safeParse(jsonContent);

    if (parsed.success) {
      cachedConfig = parsed.data;
      return cachedConfig;
    } else {
      console.log('MCP config file failed schema validation:', parsed.error.errors);
      throw new Error('Schema validation failed');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        console.log('MCP config file not found, using database config');
      } else if (error.message.includes('EACCES')) {
        console.log('MCP config file not accessible, using database config');
      } else {
        console.log('Error reading MCP config file:', error.message);
      }
    }

    // Fall back to database
    const config = await getConfig();

    const mcpConfig = {
      mcpServers: config.mcpServers,
    };

    const parsed = McpFileConfigSchema.safeParse(mcpConfig);

    if (!parsed.success) {
      throw new Error('Invalid MCP configuration: ' + JSON.stringify(parsed.error.errors));
    }

    cachedConfig = parsed.data;

    // Write to file for future use
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
    } catch (writeError) {
      console.log('Could not write MCP config file:', writeError);
      // Don't fail just because we couldn't write the file
    }

    return cachedConfig;
  }
}

export async function updateMcpConfig(newConfig: Partial<McpConfig>) {
  // Clear cache to force reload on next access
  cachedConfig = null;

  // Update the file
  await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));

  // Update the database
  await updateConfig({
    mcpServers: newConfig.mcpServers
      ? Object.fromEntries(
          Object.entries(newConfig.mcpServers).map(([key, value]) => [
            key,
            {
              command: value.command,
              args: value.args ?? [], // Add a default value for args
              env: JSON.stringify(value.env ?? {}) // Add a default value for env and convert it to a string
            }
          ])
        )
      : {}
  });
}

