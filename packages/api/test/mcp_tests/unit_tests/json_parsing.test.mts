import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import { SRCBOOK_DIR } from '../../../constants.mjs'

// Mock all possible sources of default configuration
const mockGetConfig = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockDefaultConfig = vi.fn()

// Add mock for default config
vi.mock('../../../mcp/default_config.mjs', () => ({
  getDefaultMcpConfig: mockDefaultConfig,
  DEFAULT_MCP_CONFIG: { mcpServers: {} }
}))

// Mock the config module
vi.mock('../../../config.mjs', () => ({
  getConfig: mockGetConfig,
  updateConfig: vi.fn(),
  DEFAULT_CONFIG: { mcpServers: {} }
}))

// Fix the fs/promises mock to include default export
vi.mock('node:fs/promises', async () => {
  return {
    default: {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      access: vi.fn()
    },
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    access: vi.fn()
  }
})

const baseConfig = {
  baseDir: '/test',
  defaultLanguage: 'en',
  openaiKey: null,
  anthropicKey: null,
  xaiKey: null,
  geminiKey: null,
  enabledAnalytics: false,
  installId: 'test',
  aiProvider: '',
  aiModel: null,
  aiBaseUrl: null,
  subscriptionEmail: null,
  subscriptionId: null,
  subscriptionPlan: null,
  subscriptionStatus: null,
  subscriptionQuantity: null,
  subscriptionCurrentPeriodEnd: null,
  subscriptionFeatures: [],
  subscriptionLimits: {}
}

describe('JSON Parsing', () => {
  const defaultConfigPath = path.join(SRCBOOK_DIR, 'srcbook_mcp_config.json')
  
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    
    // Reset all mocks with empty mcpServers
    mockDefaultConfig.mockReturnValue({ mcpServers: {} })
    mockGetConfig.mockImplementation(() => Promise.resolve({ 
      ...baseConfig,
      mcpServers: {} 
    }))
    mockReadFile.mockImplementation(() => Promise.resolve('{}'))
    mockWriteFile.mockImplementation(() => Promise.resolve())
    
    // Clear module cache
    vi.doUnmock('../../../mcp/config.mjs')
    vi.doUnmock('../../../mcp/default_config.mjs')
    
    // Reset modules
    vi.resetModules()
    
    // Clear any cached config
    const configModule = await import('../../../mcp/config.mjs')
    // @ts-ignore - accessing private variable for testing
    configModule.cachedConfig = null
  })

  afterEach(async () => {
    // Clear any cached config
    const configModule = await import('../../../mcp/config.mjs')
    // @ts-ignore - accessing private variable for testing
    configModule.cachedConfig = null
  })

  test('handles empty JSON object', async () => {
    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    
    const emptyConfig = {}
    mockReadFile.mockImplementation(() => Promise.resolve(JSON.stringify(emptyConfig)))
    mockGetConfig.mockImplementation(() => Promise.resolve({ 
      ...baseConfig,
      mcpServers: {} 
    }))
    mockDefaultConfig.mockReturnValue({ mcpServers: {} })

    const result = await loadMcpConfig()
    expect(result).toEqual({ mcpServers: {} })
    expect(mockReadFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles malformed JSON', async () => {
    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    
    mockReadFile.mockImplementation(() => Promise.resolve('{ "mcpServers": {'))
    mockGetConfig.mockImplementation(() => Promise.resolve({ 
      ...baseConfig,
      mcpServers: {} 
    }))
    mockDefaultConfig.mockReturnValue({ mcpServers: {} })

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(mockReadFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })

  test('handles non-JSON content', async () => {
    const { loadMcpConfig } = await import('../../../mcp/config.mjs')
    
    mockReadFile.mockImplementation(() => Promise.resolve('This is not JSON content'))
    mockGetConfig.mockImplementation(() => Promise.resolve({ 
      ...baseConfig,
      mcpServers: {} 
    }))
    mockDefaultConfig.mockReturnValue({ mcpServers: {} })

    const result = await loadMcpConfig()
    expect(result.mcpServers).toEqual({})
    expect(mockReadFile).toHaveBeenCalledWith(defaultConfigPath, 'utf-8')
  })
}) 