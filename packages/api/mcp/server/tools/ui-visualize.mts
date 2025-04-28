/**
 * UI Visualization Tool
 *
 * This module implements an MCP tool that provides UI visualization descriptions 
 * from code components to enhance the Cursor integration experience.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// Note: For progress reporting, we would need to use the underlying server instance's
// notification capabilities since progressNotification is not available in the SDK
import { z } from 'zod';
import { posthog } from '../../../posthog-client.mjs';

/**
 * Register the UI visualization tool with the MCP server
 * @param server The MCP server instance
 */
export function registerUIVisualizeTool(server: McpServer): void {
  server.tool(
    'ui-visualize',
    'Generate a visual description of UI components for better integration with design tools',
    {
      code: z.string().describe('The component code to visualize'),
      componentType: z.enum(['react', 'vue', 'angular', 'html']).optional()
        .describe('Framework for the component'),
      viewportSize: z.object({
        width: z.number().optional(),
        height: z.number().optional()
      }).optional().describe('Target viewport dimensions')
    },
    async ({ code, componentType = 'react', viewportSize = { width: 1280, height: 800 } }) => {
      try {
        console.log(`Executing ui-visualize tool for ${componentType} component`);
        
        // Send initial progress notification
        sendProgress('Analyzing component', 10);

        // In a real implementation, this would call an LLM or specialized visualization service
        // For now, we'll build a basic description based on the code parsing
        sendProgress('Parsing code elements', 30);
        const visualDescription = generateComponentVisualization(code, componentType, viewportSize);
        
        sendProgress('Generating description', 80);

        // Log the visualization request
        posthog.capture({
          event: 'mcp_ui_visualize',
          properties: { componentType },
        });

        // Send final progress notification
        sendProgress('Completed', 100);
        
        // Parse the visualization info
        const visualInfo = parseVisualization(visualDescription);
        
        // Return the visualization in standard MCP format
        return {
          content: [
            {
              type: 'text',
              text: 'Component analysis complete'
            },
            {
              type: 'resource',
              resource: {
                uri: `visualization://${componentType}`,
                mimeType: 'application/json',
                text: JSON.stringify({
                  componentType,
                  viewport: viewportSize,
                  elements: visualInfo.elements,
                  patterns: visualInfo.patterns,
                  description: visualInfo.description
                }, null, 2)
              }
            }
          ]
        };
      } catch (error) {
        console.error('Error visualizing UI component:', error);

        // Return an error response
        return {
          content: [
            {
              type: 'text',
              text: `Error visualizing UI component: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set up a helper function to send progress notifications
  const sendProgress = (stage: string, percentComplete: number) => {
    server.server.notification({
      method: 'notifications/progress',
      params: {
        progressToken: 'ui-visualize', // Should match token from request
        progress: percentComplete,
        total: 100,
        message: stage
      }
    });
  };

  console.log('Registered ui-visualize tool');
}

/**
 * Helper function to parse visualization results into structured data
 */
function parseVisualization(visualDescription: string): {
  elements: Array<{ type: string; count: number }>;
  patterns: Array<{ type: string; present: boolean }>;
  description: string;
} {
  // Simple parsing of the visualization text to extract structured data
  // In a real implementation, this would be more robust
  const elements: Array<{ type: string; count: number }> = [];
  const patterns: Array<{ type: string; present: boolean }> = [];
  
  // This is a placeholder implementation - in reality, this would parse
  // the actual visualization description more thoroughly
  const elementRegex = /(\w+)\s+\((\d+)\)/g;
  let match;
  while ((match = elementRegex.exec(visualDescription)) !== null) {
    elements.push({ 
      type: match[1] || '', 
      count: parseInt(match[2] || '0', 10) 
    });
  }
  
  // Extract pattern info
  const patternTypes = ['form', 'navigation', 'buttons', 'inputs', 'images', 'layout'];
  patternTypes.forEach(type => {
    patterns.push({
      type,
      present: visualDescription.toLowerCase().includes(type.toLowerCase())
    });
  });
  
  // Extract the main description
  const descriptionLines = visualDescription.split('\n\n');
  const description = descriptionLines.length > 0 ? descriptionLines[0] || '' : 'No description available';
  
  return { elements, patterns, description };
}

/**
 * Generate a visualization description for a UI component
 * 
 * @param code The component code
 * @param componentType The component type/framework
 * @param viewportSize The viewport dimensions
 * @returns A structured visualization description
 */
function generateComponentVisualization(
  code: string, 
  componentType: string,
  viewportSize: { width?: number, height?: number } = {}
): string {
  // Extract component elements from code
  const elements: string[] = [];
  
  // Simple regex-based extraction of UI elements
  // React/JSX elements
  if (componentType === 'react') {
    const jsxElements = code.match(/<([A-Z][a-zA-Z0-9]*|[a-z][a-zA-Z0-9]*)[^>]*>/g) || [];
    jsxElements.forEach(el => {
      const elName = el.match(/<([A-Z][a-zA-Z0-9]*|[a-z][a-zA-Z0-9]*)/)?.[1];
      if (elName) elements.push(elName);
    });
  }
  
  // Vue elements
  else if (componentType === 'vue') {
    const vueElements = code.match(/<template>[^]*?<\/template>/g)?.[0] || '';
    const templateElements = vueElements.match(/<([a-z][a-zA-Z0-9-]*)[^>]*>/g) || [];
    templateElements.forEach(el => {
      const elName = el.match(/<([a-z][a-zA-Z0-9-]*)/)?.[1];
      if (elName && elName !== 'template') elements.push(elName);
    });
  }
  
  // HTML elements
  else if (componentType === 'html' || componentType === 'angular') {
    const htmlElements = code.match(/<([a-z][a-zA-Z0-9-]*)[^>]*>/g) || [];
    htmlElements.forEach(el => {
      const elName = el.match(/<([a-z][a-zA-Z0-9-]*)/)?.[1];
      if (elName) elements.push(elName);
    });
  }
  
  // Count element types
  const elementCounts = elements.reduce((acc: Record<string, number>, el) => {
    acc[el] = (acc[el] || 0) + 1;
    return acc;
  }, {});
  
  // Check for common UI patterns
  const hasForm = code.includes('<form') || code.includes('onSubmit');
  const hasNavigation = code.includes('<nav') || code.includes('navbar') || code.includes('navigation');
  const hasButtons = code.includes('<button') || code.includes('Button');
  const hasInputs = code.includes('<input') || code.includes('Input');
  const hasImages = code.includes('<img') || code.includes('Image');
  const hasLayout = code.includes('flex') || code.includes('grid') || code.includes('container');
  
  // Format the component description
  return `<UIVisualization componentType="${componentType}" viewport="${viewportSize.width}x${viewportSize.height}">
  <ElementCounts>
${Object.entries(elementCounts)
  .map(([element, count]) => `    <Element type="${element}" count="${count}" />`)
  .join('\n')}
  </ElementCounts>
  
  <UIPatterns>
    <Pattern type="form" present="${hasForm}" />
    <Pattern type="navigation" present="${hasNavigation}" />
    <Pattern type="buttons" present="${hasButtons}" />
    <Pattern type="inputs" present="${hasInputs}" />
    <Pattern type="images" present="${hasImages}" />
    <Pattern type="layout" present="${hasLayout}" />
  </UIPatterns>
  
  <VisualDescription>
    <![CDATA[
${generateVisualSummary(code, elementCounts, { hasForm, hasNavigation, hasButtons, hasInputs, hasImages, hasLayout })}
    ]]>
  </VisualDescription>
</UIVisualization>`;
}

/**
 * Generate a human-readable visual summary of the component
 */
function generateVisualSummary(
  code: string, 
  elements: Record<string, number>,
  patterns: { hasForm: boolean, hasNavigation: boolean, hasButtons: boolean, hasInputs: boolean, hasImages: boolean, hasLayout: boolean }
): string {
  const { hasForm, hasNavigation, hasButtons, hasInputs, hasImages, hasLayout } = patterns;
  
  let summary = `Component contains ${Object.values(elements).reduce((a, b) => a + b, 0)} elements total.\n\n`;
  
  // Determine component type
  if (hasNavigation) {
    summary += "This appears to be a navigation component with ";
    summary += hasButtons ? "navigation buttons or links. " : "navigation elements. ";
  } else if (hasForm) {
    summary += "This appears to be a form component with ";
    summary += hasInputs ? `${elements['input'] || 0} input fields. ` : "form elements. ";
  } else if (Object.keys(elements).includes('table') || Object.keys(elements).includes('tr')) {
    summary += "This appears to be a table or data display component. ";
  } else if (hasImages && (elements['img'] || 0) > 3) {
    summary += "This appears to be a gallery or image showcase component. ";
  } else if (hasButtons && (elements['button'] || 0) > 3) {
    summary += "This appears to be a control panel or button toolbar. ";
  } else {
    summary += "This appears to be a general UI component ";
    summary += hasLayout ? "with structured layout. " : "with basic structure. ";
  }
  
  // Add details about specific elements
  const significantElements = Object.entries(elements)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5);
  
  if (significantElements.length > 0) {
    summary += "\n\nKey elements include: ";
    summary += significantElements
      .map(([element, count]) => `${element} (${count})`)
      .join(", ");
  }
  
  // Add style insights
  if (code.includes('tailwind')) {
    summary += "\n\nStyling uses Tailwind CSS classes.";
  } else if (code.includes('styled-components') || code.includes('styled(')) {
    summary += "\n\nStyling uses styled-components.";
  } else if (code.includes('className=')) {
    summary += "\n\nStyling uses traditional CSS classes.";
  } else if (code.includes('style=')) {
    summary += "\n\nStyling uses inline styles.";
  }
  
  return summary;
}