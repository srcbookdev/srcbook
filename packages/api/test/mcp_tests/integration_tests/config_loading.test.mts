import { describe, test, expect, beforeEach, vi } from 'vitest'

// Setup mocks with inline functions
vi.mock('../../../config.mjs', () => ({
  getConfig: vi.fn(() => Promise.resolve({ mcpServers: {} } as any)),
  updateConfig: vi.fn()
}))

vi.mock('node:fs/promises', () => {
  const mockFunctions = {
    readFile: vi.fn(() => Promise.resolve('')),
    writeFile: vi.fn()
  }
  return {
    default: mockFunctions,
    ...mockFunctions
  }
})

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    request: vi.fn()
  }))
}))

// Import after mocks
import { MCPHub } from '../../../mcp/mcphub.mjs'
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { getConfig } from '../../../config.mjs'
import * as fsPromises from 'node:fs/promises'

describe('MCP Config Integration', () => {
  let mcpHub: MCPHub

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Create a new instance for each test
    mcpHub = new MCPHub()
    // Reset any static/shared state
    // @ts-ignore - accessing private static field for testing
    MCPHub.instance = undefined
  })

  afterEach(() => {
    // Clean up any remaining state
    // @ts-ignore - accessing private field for testing
    mcpHub.initialized = false
    // @ts-ignore - accessing private static field for testing
    MCPHub.instance = undefined
  })

  test('loads config from file and connects to server', async () => {
    const validConfig = {
      mcpServers: {
        'test-server': {
          host: 'http://localhost:3000',
          tools: ['test-tool']
        }
      }
    }

    vi.mocked(getConfig).mockImplementation(() => Promise.resolve({ mcpServers: {} } as any))
    vi.mocked(fsPromises.readFile).mockImplementation(() => Promise.resolve(JSON.stringify(validConfig)))

    // Create a mock client
    const mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      request: vi.fn().mockResolvedValue({
        tools: [{ name: 'test-tool', description: 'A test tool' }]
      })
    }

    // Set up client mock
    vi.mocked(Client).mockImplementation(() => mockClient as unknown as Client)

    // Initialize and test
    await mcpHub.initialize()

    const connections = mcpHub.listConnections()
    expect(connections).toHaveLength(1)
    expect(connections[0]).toEqual({
      name: 'test-server',
      status: 'connected',
      error: undefined
    })

    // Verify tools can be listed
    const tools = await mcpHub.listTools('test-server')
    expect(tools).toHaveLength(1)
    expect(tools[0]).toEqual({
      name: 'test-tool',
      description: 'A test tool'
    })
  })

  test('handles invalid config gracefully', async () => {
    const invalidConfig = {
      mcpServers: {
        'test-server': {
          // Missing required 'host' field
          tools: ['test-tool']
        }
      }
    }

    // Mock a failed connection
    const mockClient = {
      connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
      close: vi.fn(),
      request: vi.fn()
    }
    vi.mocked(Client).mockImplementation(() => mockClient as unknown as Client)

    vi.mocked(fsPromises.readFile).mockImplementation(() => Promise.resolve(JSON.stringify(invalidConfig)))
    vi.mocked(getConfig).mockImplementation(() => Promise.resolve({ mcpServers: {} } as any))

    await mcpHub.initialize()

    const connections = mcpHub.listConnections()
    expect(connections).toHaveLength(1)
    expect(connections[0]).toEqual({
      name: 'test-server',
      status: 'disconnected',
      error: 'Connection failed'
    })
  })

  test('caches config after first load', async () => {
    const validConfig = {
      mcpServers: {
        'test-server': {
          host: 'http://localhost:3000',
          tools: ['test-tool']
        }
      }
    }

    vi.mocked(fsPromises.readFile).mockImplementation(() => Promise.resolve(JSON.stringify(validConfig)))
    vi.mocked(getConfig).mockImplementation(() => Promise.resolve({ mcpServers: {} } as any))

    // First initialization
    await mcpHub.initialize()
    
    // Clear mocks to verify second call
    vi.clearAllMocks()
    
    // Reset initialization state before second call
    // @ts-ignore - accessing private field for testing
    mcpHub.initialized = false
    
    // Second initialization
    await mcpHub.initialize()

    expect(vi.mocked(fsPromises.readFile)).toHaveBeenCalledTimes(0)
    expect(vi.mocked(getConfig)).toHaveBeenCalledTimes(0)
  })
}) 