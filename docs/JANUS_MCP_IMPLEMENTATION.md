# Janus Agent Implementation for MCP

This document outlines the implementation of Srcbook's Janus agent capabilities using the Model Context Protocol (MCP).

## Overview

The Janus agent allows Srcbook to serve its UI generation capabilities to any MCP-compatible client while also consuming capabilities from other MCP servers. This bidirectional approach enhances the ecosystem:

- **MCP Clients** gain access to Srcbook's advanced UI generation capabilities
- **Srcbook** can leverage specialized features from other MCP servers

## Implementation Architecture

### Components

1. **MCP Server Manager**: Manages the MCP server, handles connections and tool registration
2. **Generate App Tool**: Exposes Srcbook's app generation functionality as an MCP tool
3. **UI Visualize Tool**: Provides UI component visualization descriptions for better integration with design tools
4. **Standardized Response Format**: Structured output following MCP conventions

### Data Flow

1. Any MCP client connects to Srcbook via MCP
2. User requests UI generation through the client
3. Request is passed to Srcbook's Janus agent via MCP
4. Srcbook processes the request and generates UI components
5. Structured response is returned to the client
6. Client processes and displays the generated UI accordingly

## Tools & Capabilities

### Generate App Tool

The `generate-app` tool creates complete UI applications from natural language descriptions.

**Parameters:**
- `query`: Natural language description of the app to generate (required)
- `projectName`: Optional project name
- `componentType`: Framework for component generation (react, vue, angular, html)
- `styleSystem`: Styling system to use (tailwind, css, sass, styled-components)

**Response Format:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Successfully generated app with project ID: [project-id]"
    },
    {
      "type": "resource",
      "resource": {
        "uri": "file://[path]",
        "mimeType": "application/javascript",
        "text": "...file content..."
      }
    },
    {
      "type": "image",
      "data": "base64-encoded-data",
      "mimeType": "image/png"
    }
  ]
}
```

### UI Visualize Tool

The `ui-visualize` tool provides visual descriptions of UI components to enhance the design integration.

**Parameters:**
- `code`: The component code to visualize (required)
- `componentType`: Framework for the component (react, vue, angular, html)
- `viewportSize`: Target viewport dimensions (width, height)

**Response Format:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Component analysis complete"
    },
    {
      "type": "resource",
      "resource": {
        "uri": "visualization://[framework]",
        "mimeType": "application/json",
        "text": "{\"componentType\":\"[framework]\",\"viewport\":{\"width\":1280,\"height\":800},\"elements\":[{\"type\":\"[element-type]\",\"count\":3}],\"patterns\":[{\"type\":\"[pattern-type]\",\"present\":true}],\"description\":\"...human-readable description...\"}"
      }
    }
  ]
}
```

## Progress Notifications

The implementation supports progress notifications to provide real-time feedback during UI generation. This is implemented using the MCP standard notification format:

```typescript
// Access the underlying Server instance for notifications
server.server.sendNotification({
  method: 'notifications/progress',
  params: {
    progressToken: 'generate-app', // Matches token from request
    progress: 50,                  // Current progress 
    total: 100,                    // Total progress required
    message: 'Component generation' // Human-readable message
  }
});
```

## Getting Started

### Client Setup

1. Configure any MCP-compatible client to connect to Srcbook's MCP server
2. Add Srcbook to the client's trusted MCP server list
3. Set up appropriate permissions for MCP tool access

### Srcbook Setup

1. Enable the MCP server in `srcbook_mcp_config.json`
2. Start Srcbook with the MCP server enabled
3. Verify connections in the logs

## Example Usage

### Generating a UI Component with Any MCP Client

```typescript
// Connect to Srcbook MCP server
const server = await mcp.connect('srcbook-mcp-server');

// Call generate-app tool
const result = await server.tools.call('generate-app', {
  query: 'Create a responsive product card component with image, title, price, and add to cart button',
  componentType: 'react',
  styleSystem: 'tailwind'
});

// Process the MCP-standard content array
const textResponse = result.content.find(item => item.type === 'text');
const resources = result.content.filter(item => item.type === 'resource');
const images = result.content.filter(item => item.type === 'image');

// Work with resources and images
resources.forEach(resource => {
  const { uri, text, mimeType } = resource.resource;
  console.log(`Processing resource ${uri} of type ${mimeType}`);
});
```

## Extending the Implementation

Additional capabilities can be added to enhance the MCP integration:

1. **Resource Access**: Add file system resources for shared access to assets
2. **UI Component Library**: Create a library of reusable UI components
3. **Interactive Refinement**: Add interactive conversation capabilities for UI refinement
4. **More Tool Types**: Implement additional specialized tools for different use cases
5. **Design System Support**: Add support for various design systems (Material UI, Chakra UI, etc.)

## Security Considerations

1. **Input Validation**: All inputs are validated using Zod schemas
2. **Authentication**: SSE transport connections use token-based authentication
3. **Authorization**: Access controls restrict unauthorized access
4. **Data Sanitization**: File contents and responses are properly sanitized
5. **Secure Defaults**: Servers have secure defaults with explicit opt-in for remote connections

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**: Verify network settings and authentication tokens
2. **Progress Notification Errors**: Check protocol version compatibility
3. **Response Formatting Issues**: Ensure proper JSON parsing in the client
4. **Tool Parameter Errors**: Verify parameter types match the schema definition

For technical support, contact the Srcbook team or file an issue on GitHub.

## MCP Compliance

This implementation follows the MCP specification for server-side tools:

1. **Tool Schema Definition**: Clear schemas using Zod
2. **Response Format**: Standard MCP `content` array with multiple content types (text, resources, images)
3. **Progress Notifications**: Following the standard `notifications/progress` format
4. **Error Handling**: Properly structured error responses with `isError: true`

The implementation is fully compliant with the 2025-03-26 revision of the MCP specification, supporting:

- **Content Types**: Text, Resources, and Images
- **Resource Embedding**: Structured as specified in the protocol
- **Standard Notifications**: Using the proper notification format
- **Well-formed Responses**: Following the exact MCP schema

This ensures compatibility with any client that supports the MCP tools capability, regardless of the client's implementation language or environment.