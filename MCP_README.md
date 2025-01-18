# Model Context Protocol (MCP) Integration

Srcbook now features a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) client, enabling secure and standardized interactions between your applications and external tools via MCP. Currently, MCP is primarily integrated with the AI-assisted app building functionality.

## Overview

MCP allows Srcbook to:
- Enhance AI code generation with sequential, o1-style thinking
- Access local files securely (when configured)
- Connect to various utility servers

> **Note**: MCP integration is currently focused on the app builder functionality, with notebook integration planned for future releases.

## Getting Started

### Prerequisites

- Srcbook running locally
- Node.js 20.x **(This is important, as Node 22.x runs into issues with Rollup and MCP)**

- Access to your local filesystem

### Configuration

1. Navigate to `packages/api/` in your Srcbook installation directory
2. Locate `srcbook_mcp_config.example.json`
3. Create a new file named `srcbook_mcp_config.json` based on the example
4. Configure the filesystem paths:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/PATH/TO/YOUR/DESKTOP",
        "/PATH/TO/YOUR/DOWNLOADS"
      ]
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    },
    "mcp-installer": {
      "command": "npx",
      "args": ["@anaisbetts/mcp-installer"]
    }
  }
}
```

> **Important**: Replace `/PATH/TO/YOUR/DESKTOP` and `/PATH/TO/YOUR/DOWNLOADS` with the actual paths to your Desktop and Downloads folders.

5. To ensure you're running Node 20.x, use the following commands in your terminal:

```bash
nvm install 20
nvm use 20
```

## Available Servers

Srcbook comes with several pre-configured MCP servers that don't require API keys:

- **memory**: Basic memory operations ([source](https://github.com/modelcontextprotocol/servers/tree/main/src/memory))
- **filesystem**: Secure file system access ([source](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)) - **Note**: This server is not operational in Srcbook yet.
- **puppeteer**: Browser automation capabilities ([source](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer))
- **sequential-thinking**: Enhanced, o1-style reasoning ([source](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking))
- **everything**: Test server for builders of MCP clients ([source](https://github.com/modelcontextprotocol/servers/tree/main/src/everything))
- **mcp-installer**: MCP server installation utility

## Using MCP in the App Builder

### Sequential Thinking

The primary MCP integration currently available is the sequential thinking feature in the app builder:

1. Open the app builder
2. Toggle sequential thinking on/off using the interface
3. When enabled, the AI code editing process will utilize the sequential-thinking server
4. You can verify server usage by checking your terminal output

## Troubleshooting

### Common Issues

1. **Server Configuration**
   - Verify your `srcbook_mcp_config.json` exists and is properly formatted
   - Check that filesystem paths are correct and accessible
   - Ensure Node.js version is 18+

2. **Sequential Thinking Issues**
   - Check terminal output for server connection status
   - Verify the server is properly installed via npx
   - Restart Srcbook if server connection fails

### Known Limitations

1. **Notebook Integration**
   - MCP is not currently integrated with notebook functionality
   - Future releases will expand MCP support to notebooks

2. **File Access**
   - Limited to configured Desktop and Downloads directories
   - Must be explicitly configured in json file

## Getting Help

- Join our [Discord Community](https://discord.gg/shDEGBSe2d)
- File issues on [GitHub](https://github.com/srcbookdev/srcbook)

## Future Development

Planned expansions of MCP functionality include:

1. Notebook integration for code cells
2. Additional server integrations
3. Enhanced file system capabilities
4. Expanded AI assistance features

## Contributing

We welcome contributions to improve MCP integration in Srcbook. Please check our [Contributing Guidelines](CONTRIBUTING.md) before submitting changes.