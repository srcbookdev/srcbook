# Srcbook MCP Server

This directory contains the implementation of Srcbook's MCP server functionality, which allows Srcbook to expose its generative AI capabilities to other MCP clients.

## Overview

The MCP server implementation follows the [Model Context Protocol](https://modelcontextprotocol.io/) specification and uses the official TypeScript SDK. It exposes Srcbook's web app generation functionality as MCP tools that can be called by other MCP clients.

## Architecture

The server implementation consists of:

1. **Server Manager**: Manages the MCP server instance, handles connections, and registers tools.
2. **Tools**: Implementations of MCP tools that wrap Srcbook's generative AI functionality.
3. **Server Entry Point**: The main entry point for the MCP server.

## Configuration

The MCP server is configured in the `srcbook_mcp_config.json` file, which includes:

```json
{
  "mcpServer": {
    "enabled": true,
    "allowRemoteConnections": false,
    "port": 2151,
    "authToken": "your-auth-token-for-remote-connections"
  }
}
```

## Available Tools

### generate-app

Generates a web application based on a natural language description.

**Input Schema:**
```json
{
  "query": "string",
  "projectName": "string (optional)"
}
```

**Example:**
```json
{
  "query": "Create a simple todo list app with React",
  "projectName": "todo-app"
}
```

## Usage

The MCP server is automatically started when Srcbook is launched in "Janus mode" (both client and server). It can be accessed by other MCP clients using either stdio or SSE transport.

## Security

The MCP server implementation includes:
- Input validation using Zod schemas
- Proper error handling
- Authentication for remote connections (when enabled)
- Secure handling of file paths and system commands

## Future Enhancements

- Add more tools for other Srcbook capabilities
- Implement resource templates for accessing project files
- Add support for prompts
- Implement streaming responses for long-running operations
