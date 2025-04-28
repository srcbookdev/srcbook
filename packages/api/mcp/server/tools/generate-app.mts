/**
 * Generate App Tool
 *
 * This module implements an MCP tool that wraps Srcbook's app generation functionality.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generateApp } from '../../../ai/generate.mjs';
import { randomid } from '@srcbook/shared';
import { posthog } from '../../../posthog-client.mjs';
import { z } from 'zod';

/**
 * Register the generate app tool with the MCP server
 * @param server The MCP server instance
 */
export function registerGenerateAppTool(server: McpServer): void {
  server.tool(
    'generate-app',
    'Generate a web application from a natural language description',
    {
      query: z.string().describe('Natural language description of the app to generate'),
      projectName: z.string().optional().describe('Optional project name'),
      componentType: z.enum(['react', 'vue', 'angular', 'html']).optional()
        .describe('Framework for component generation'),
      styleSystem: z.enum(['tailwind', 'css', 'sass', 'styled-components']).optional()
        .describe('Styling system to use')
    },
    async ({ query, projectName, componentType = 'react', styleSystem = 'tailwind' }) => {
      try {
        console.log(`Executing generate-app tool with query: ${query}`);
        
        // Send initial progress notification
        sendProgress('Initializing project', 10);

        // Generate a project ID if not provided
        const projectId = projectName ? projectName.replace(/[^a-zA-Z0-9-_]/g, '-') : `app-${randomid()}`;

        // Create an empty project structure with the required filename property
        const files = [
          {
            filename: 'index.html',
            content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>New App</title>\n</head>\n<body>\n  <div id="app"></div>\n</body>\n</html>',
          },
        ];
        
        // Send progress update
        sendProgress('Generating components', 30);

        // Generate the app
        const result = await generateApp(projectId, files, query);
        
        // Send progress update
        sendProgress('Processing results', 70);

        // Parse the result to extract file content
        const generatedFiles = parseGeneratedFiles(result);

        // Log the generation
        posthog.capture({
          event: 'mcp_generate_app',
          properties: { query, componentType, styleSystem },
        });
        
        // Send final progress notification
        sendProgress('Completed', 100);

        // Return the result in standard MCP format
        return {
          content: [
            {
              type: 'text',
              text: `Successfully generated app with project ID: ${projectId}`
            },
            ...generatedFiles.map(file => {
              const fileType = determineFileType(file.filename);
              // For image files, return image content
              if (fileType === 'resource' && file.filename.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                return {
                  type: 'image' as const,
                  data: Buffer.from(file.content).toString('base64'),
                  mimeType: `image/${file.filename.split('.').pop()?.toLowerCase() || 'png'}`
                };
              }
              
              // For other files return as resource content
              return {
                type: 'resource' as const,
                resource: {
                  uri: `file://${file.filename}`,
                  mimeType: getMimeType(file.filename),
                  text: file.content
                }
              };
            })
          ]
        };
      } catch (error) {
        console.error('Error generating app:', error);

        // Return an error response
        return {
          content: [
            {
              type: 'text',
              text: `Error generating app: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set up a helper function to send progress notifications
  // This uses the underlying Server instance from the McpServer
  const sendProgress = (stage: string, percentComplete: number) => {
    server.server.notification({
      method: 'notifications/progress',
      params: {
        progressToken: 'generate-app', // Should match token from request
        progress: percentComplete,
        total: 100,
        message: stage
      }
    });
  };
  
  // Example usage during long operations:
  // sendProgress('Initializing', 10);
  // sendProgress('Generating UI components', 50);
  // sendProgress('Finalizing', 90);

  console.log('Registered generate-app tool');
}

/**
 * Parse the generated files from the result text
 * @param resultText The result text from the app generation
 * @returns An array of file objects
 */
function parseGeneratedFiles(resultText: string): Array<{ filename: string; content: string }> {
  const files: Array<{ filename: string; content: string }> = [];

  // Look for file blocks in the format:
  // ```filename.ext
  // content
  // ```
  const fileBlockRegex = /```(?:[\w-]+\s+)?([^\n]+)\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = fileBlockRegex.exec(resultText)) !== null) {
    if (match[1] && match[2]) {
      const filename = match[1].trim();
      const content = match[2];

      // Skip if the filename is empty or doesn't look like a valid path
      if (!filename || filename.includes('...')) {
        continue;
      }

      files.push({
        filename,
        content,
      });
    }
  }

  return files;
}

/**
 * Determine the file type based on filename and content
 * @param filename The filename
 * @returns The file type (component, resource, config, etc.)
 */
function determineFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['jsx', 'tsx'].includes(ext || '')) {
    return 'component';
  } else if (['json', 'config.js', 'yml', 'yaml'].some(suffix => filename.endsWith(suffix))) {
    return 'config';
  } else if (['css', 'scss', 'less', 'svg', 'png', 'jpg', 'jpeg', 'gif'].includes(ext || '')) {
    return 'resource';
  } else if (['js', 'ts'].includes(ext || '')) {
    return 'script';
  } else if (['html', 'htm'].includes(ext || '')) {
    return 'document';
  } else {
    return 'file';
  }
}

/**
 * Get MIME type based on file extension
 * @param filename The filename
 * @returns The MIME type
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Text formats
    'txt': 'text/plain',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'csv': 'text/csv',
    'md': 'text/markdown',
    
    // JavaScript/TypeScript
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    
    // JSON/config
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/yaml',
    'yml': 'application/yaml',
    
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    
    // Other
    'pdf': 'application/pdf'
  };
  
  return mimeTypes[ext || ''] || 'text/plain';
}