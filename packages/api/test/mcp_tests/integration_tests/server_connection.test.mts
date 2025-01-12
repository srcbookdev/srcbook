import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { MCPHub } from '../../../mcp/mcphub.mjs'
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

// Mock the SDK client and transport
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    listTools: vi.fn().mockResolvedValue([
      { name: 'test-tool', description: 'A test tool' }
    ])
  }))
}))

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn(() => ({
    start: vi.fn(),
    close: vi.fn(),
    stderr: {
      on: vi.fn()
    }
  }))
}))

describe('MCP Server Integration', () => {
  let mcpHub: MCPHub
  
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create fresh instances
    mcpHub = new MCPHub()
    
    // Mock config
    vi.mock('../../../mcp/config.mjs', () => ({
      loadMcpConfig: vi.fn().mockResolvedValue({
        mcpServers: {
          'test-server': {
            host: 'http://localhost:3000',
            tools: ['test-tool']
          }
        }
      })
    }))
  })

  afterEach(() => {
    vi.resetModules()
  })

  test('successfully connects to configured MCP server and lists tools', async () => {
    // Create a mock client with properly typed async functions
    const mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      request: vi.fn().mockResolvedValue({
        tools: [
          { name: 'test-tool', description: 'A test tool' }
        ]
      })
    }

    // Important: Mock implementation needs to be set before MCPHub initialization
    vi.mocked(Client).mockImplementation(() => mockClient as unknown as Client)

    // Initialize the hub
    await mcpHub.initialize()

    // Verify tools can be listed
    const tools = await mcpHub.listTools('test-server')
    console.log('request called with:', mockClient.request.mock.calls)
    console.log('Returned tools:', tools)

    expect(tools).toHaveLength(1)
    expect(tools[0]).toEqual({
      name: 'test-tool',
      description: 'A test tool'
    })
  })

  test('handles connection failures gracefully', async () => {
    // Mock a connection failure
    const mockError = new Error('Connection failed')
    const mockClient = {
      connect: vi.fn().mockRejectedValue(mockError),
      close: vi.fn(),
      listTools: vi.fn()
    }
    vi.mocked(Client).mockImplementation(() => mockClient as unknown as Client)

    // Initialize the hub
    await mcpHub.initialize()

    // Verify connection status reflects the error
    const connections = mcpHub.listConnections()
    expect(connections).toHaveLength(1)
    expect(connections[0]).toEqual({
      name: 'test-server',
      status: 'disconnected',
      error: 'Connection failed'
    })
  })
})