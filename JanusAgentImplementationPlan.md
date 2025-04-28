# Janus Agent Implementation Plan for Srcbook

## Overview

This document outlines the implementation plan for "Janus agents" in Srcbook - agentic entities that can both utilize external capabilities through an MCP client and serve functionality to other clients like an MCP server.

The implementation will focus specifically on exposing Srcbook's web app generation functionality as MCP tools, allowing other MCP clients to leverage Srcbook's generative AI capabilities.

## Architecture

The Janus agent will consist of:

1. **MCP Server Manager**: A class that manages MCP server instances, handles connections, and registers tools.
2. **App Generation Tool**: A tool that wraps Srcbook's existing app generation functionality.
3. **Server Entry Point**: The main entry point for the MCP server.
4. **Configuration**: Settings for the MCP server.

## Implementation Steps

### 1. Create MCP Server Manager

File: `packages/api/mcp/server/server-manager.mts`

This class will:
- Initialize the MCP server using the SDK
- Register tools with the server
- Handle connections using the appropriate transport (stdio)
- Manage server lifecycle (start, stop)
- Implement proper error handling and logging

### 2. Implement App Generation Tool

File: `packages/api/mcp/server/tools/generate-app.mts`

This tool will:
- Define a clear input schema using Zod
- Wrap the existing `generateApp` function
- Format responses according to MCP specifications
- Handle errors properly
- Include appropriate annotations (e.g., destructiveHint: false)

### 3. Create Server Entry Point

File: `packages/api/mcp/server/index.mts`

This module will:
- Export functions to start/stop the server
- Handle transport setup and connection management
- Initialize the server manager

### 4. Update Configuration

File: `packages/api/mcp/config.mts`

This module will:
- Define configuration options for the MCP server
- Load and validate configuration

### 5. Update Main Server

File: `packages/api/server.mts`

Update to:
- Initialize both MCP client and server components
- Ensure proper resource management and error handling

### 6. Update MCP Configuration

File: `packages/api/srcbook_mcp_config.json`

Add configuration section for the MCP server.

## Security Considerations

- Validate all inputs using Zod schemas
- Implement proper error handling
- Sanitize file paths and system commands
- Use appropriate authentication for remote connections
- Follow the principle of least privilege

## Testing Strategy

- Test the MCP server in isolation using the MCP Inspector tool
- Test integration with the existing MCP client
- Test the app generation tool with various inputs
- Test error handling and edge cases

## Future Enhancements

- Add more tools for other Srcbook capabilities
- Implement resource templates for accessing project files
- Add support for prompts
- Implement streaming responses for long-running operations
